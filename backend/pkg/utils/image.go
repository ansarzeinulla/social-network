package utils

import (
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofrs/uuid"
)

// ProcessImageUpload extracts a file from the multipart form, validates that
// it is actually an image (by sniffing the content, not just trusting the
// extension), and saves it under uploadDir with a UUID name.
//
// Returns:
//   - "", nil   when no file was uploaded (form key missing)
//   - relative URL like "/uploads/<uuid>.jpg" on success
//   - error when the file is too large, has wrong type, or save failed
//
// Why content sniffing matters: a malicious actor can rename `evil.exe` to
// `evil.jpg`, the extension whitelist would let it through, and on a CDN the
// browser may execute it. http.DetectContentType inspects the first 512 bytes
// (the magic bytes) and returns the real MIME type.
func ProcessImageUpload(r *http.Request, formKey string, uploadDir string) (string, error) {
	file, header, err := r.FormFile(formKey)
	if err != nil {
		if err == http.ErrMissingFile {
			return "", nil
		}
		return "", err
	}
	defer file.Close()

	// Size limit (5 MiB). The outer ParseMultipartForm should already cap
	// total size, but we double-check this individual file.
	const maxImageSize = 5 << 20
	if header.Size > maxImageSize {
		return "", errors.New("image too large (max 5MiB)")
	}

	// Sniff content type from the first 512 bytes. Then rewind so we can
	// copy the file from the start.
	head := make([]byte, 512)
	n, err := file.Read(head)
	if err != nil && err != io.EOF {
		return "", errors.New("could not read uploaded file")
	}
	contentType := http.DetectContentType(head[:n])

	allowedMIME := map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/gif":  ".gif",
		"image/webp": ".webp",
	}
	ext, ok := allowedMIME[contentType]
	if !ok {
		return "", errors.New("invalid image format. Supported: JPG, PNG, GIF, WEBP")
	}

	// Cross-check: make sure the original filename's extension is also one
	// of the allowed ones (defense in depth — protects against odd CDNs that
	// dispatch by extension regardless of Content-Type).
	origExt := strings.ToLower(filepath.Ext(header.Filename))
	if origExt != "" && origExt != ext &&
		!(origExt == ".jpeg" && ext == ".jpg") {
		return "", errors.New("file extension does not match content")
	}

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", errors.New("could not rewind uploaded file")
	}

	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", errors.New("failed to create upload directory")
	}

	id, _ := uuid.NewV4()
	newFileName := id.String() + ext
	filePath := filepath.Join(uploadDir, newFileName)

	dst, err := os.Create(filePath)
	if err != nil {
		return "", errors.New("failed to create destination file")
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(filePath)
		return "", errors.New("failed to save uploaded file")
	}

	urlPrefix := "/" + filepath.Base(uploadDir) + "/"
	return urlPrefix + newFileName, nil
}

// DeleteImage removes an image from the filesystem given its relative URL path.
func DeleteImage(urlPath string, baseDir string) error {
	if urlPath == "" {
		return nil
	}
	fileName := filepath.Base(urlPath)
	filePath := filepath.Join(baseDir, fileName)
	if _, err := os.Stat(filePath); err == nil {
		return os.Remove(filePath)
	}
	return nil
}
