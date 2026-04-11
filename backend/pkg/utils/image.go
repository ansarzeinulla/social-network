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

// ProcessImageUpload handles image extraction, validation, and saving.
// Returns the relative URL path to the saved image, or empty string if no image was uploaded.
func ProcessImageUpload(r *http.Request, formKey string, uploadDir string) (string, error) {
	file, header, err := r.FormFile(formKey)
	if err != nil {
		if err == http.ErrMissingFile {
			return "", nil
		}
		return "", err
	}
	defer file.Close()

	// Validate image type
	ext := strings.ToLower(filepath.Ext(header.Filename))
	validExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !validExts[ext] {
		return "", errors.New("invalid image format. Supported: JPG, PNG, GIF, WEBP")
	}

	// Ensure upload directory exists
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			return "", errors.New("failed to create upload directory")
		}
	}

	// Generate unique name
	id, _ := uuid.NewV4()
	newFileName := id.String() + ext
	filePath := filepath.Join(uploadDir, newFileName)

	dst, err := os.Create(filePath)
	if err != nil {
		return "", errors.New("failed to create destination file")
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", errors.New("failed to save uploaded file")
	}

	// Return the relative URL path (assuming the directory name is also the URL prefix)
	// We use the base directory name from the config or parameter
	urlPrefix := "/" + filepath.Base(uploadDir) + "/"
	return urlPrefix + newFileName, nil
}

// DeleteImage removes an image from the filesystem given its relative URL path.
func DeleteImage(urlPath string, baseDir string) error {
	if urlPath == "" {
		return nil
	}
	// Convert URL path (/uploads/filename.ext) to filesystem path (baseDir/filename.ext)
	fileName := filepath.Base(urlPath)
	filePath := filepath.Join(baseDir, fileName)
	
	if _, err := os.Stat(filePath); err == nil {
		return os.Remove(filePath)
	}
	return nil
}
