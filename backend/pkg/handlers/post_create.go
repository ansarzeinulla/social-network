package handlers

import (
	"fmt"
	"net/http"
	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
	"social-network/pkg/utils"
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

	content := r.FormValue("content")
	privacy := r.FormValue("privacy")
	viewers := r.MultipartForm.Value["viewers"]

	if err := utils.ValidateCreatePost(content, privacy); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	followers, err := sqlite.GetFollowersOfUser(userID)
	if err != nil {
		http.Error(w, "Database error checking followers", http.StatusInternalServerError)
		return
	}

	validViewers, err := utils.ValidatePostViewers(privacy, viewers, followers)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	imageUrl, err := utils.ProcessImageUpload(r, "image", "./data/uploads")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Insert into DB via centralized helper
	_, err = sqlite.CreatePost(userID, content, imageUrl, privacy, validViewers)
	if err != nil {
		http.Error(w, "Failed to create post", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, "Post created")
}
