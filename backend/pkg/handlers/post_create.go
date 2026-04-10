package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
	"social-network/pkg/utils"
	"strconv"
	"strings"

	"github.com/gofrs/uuid"
)

func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int64)

	// Max 10MB upload
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Invalid form data or file too large", http.StatusBadRequest)
		return
	}

	title := r.FormValue("title")
	content := r.FormValue("content")
	privacy := r.FormValue("privacy")
	viewers := r.MultipartForm.Value["viewers"]

	// Validation
	if err := utils.ValidateLength(title, 1, 100); err != nil {
		http.Error(w, "Title must be 1-100 characters", http.StatusBadRequest)
		return
	}
	if err := utils.ValidateLength(content, 1, 10000); err != nil {
		http.Error(w, "Content must be 1-10000 characters", http.StatusBadRequest)
		return
	}
	
	validViewers := []int64{}
	if privacy == "private" {
		if len(viewers) == 0 {
			http.Error(w, "Private posts must have at least one viewer selected", http.StatusBadRequest)
			return
		}

		followers, err := sqlite.GetFollowersOfUser(userID)
		if err != nil {
			http.Error(w, "Database error checking followers", http.StatusInternalServerError)
			return
		}
		
		followerMap := make(map[int64]bool)
		for _, f := range followers {
			followerMap[f.ID] = true
		}

		for _, vIDStr := range viewers {
			vID, err := strconv.ParseInt(vIDStr, 10, 64)
			if err != nil || !followerMap[vID] {
				http.Error(w, "Invalid viewer selected (must be a follower)", http.StatusBadRequest)
				return
			}
			validViewers = append(validViewers, vID)
		}
	}

	if privacy != "public" && privacy != "almost_private" && privacy != "private" {
		privacy = "public"
	}

	var imageUrl string
	file, header, err := r.FormFile("image")
	if err == nil {
		defer file.Close()
		
		// Validate image type
		ext := strings.ToLower(filepath.Ext(header.Filename))
		validExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
		if !validExts[ext] {
			http.Error(w, "Invalid image format. Supported: JPG, PNG, GIF, WEBP", http.StatusBadRequest)
			return
		}

		// Generate unique name
		id, _ := uuid.NewV4()
		newFileName := id.String() + ext
		uploadDir := "./uploads"
		if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
			os.Mkdir(uploadDir, 0755)
		}
		
		filePath := filepath.Join(uploadDir, newFileName)
		dst, err := os.Create(filePath)
		if err != nil {
			http.Error(w, "Error saving file", http.StatusInternalServerError)
			return
		}
		defer dst.Close()
		
		if _, err := io.Copy(dst, file); err != nil {
			http.Error(w, "Error saving file", http.StatusInternalServerError)
			return
		}
		imageUrl = "/uploads/" + newFileName
	}

	// Insert into DB via centralized helper
	_, err = sqlite.CreatePost(userID, title, content, imageUrl, privacy, validViewers)
	if err != nil {
		http.Error(w, "Failed to create post", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, "Post created")
}
