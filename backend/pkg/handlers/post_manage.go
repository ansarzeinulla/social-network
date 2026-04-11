package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
	"social-network/pkg/utils"
	"strconv"
)

func GetPostHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	post, err := sqlite.GetPostByID(id)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if post == nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	// Fetch viewers if private
	viewers := []int64{}
	if post.Privacy == "private" {
		viewers, _ = sqlite.GetPostViewers(id)
	}

	resp := map[string]interface{}{
		"post":    post,
		"viewers": viewers,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func UpdatePostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int64)

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	idStr := r.FormValue("id")
	postID, _ := strconv.ParseInt(idStr, 10, 64)

	// Check ownership
	existing, err := sqlite.GetPostByID(postID)
	if err != nil || existing == nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}
	if existing.UserID != userID {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	title := r.FormValue("title")
	content := r.FormValue("content")
	privacy := r.FormValue("privacy")
	viewers := r.MultipartForm.Value["viewers"]

	if err := utils.ValidateCreatePost(title, content, privacy); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	followers, _ := sqlite.GetFollowersOfUser(userID)
	validViewers, err := utils.ValidatePostViewers(privacy, viewers, followers)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Handle Image
	imageUrl := existing.ImageURL
	newImage, err := utils.ProcessImageUpload(r, "image", "./uploads")
	if err == nil && newImage != "" {
		// Delete old image if it exists and we have a new one
		if existing.ImageURL != "" {
			utils.DeleteImage(existing.ImageURL, "./uploads")
		}
		imageUrl = newImage
	}

	err = sqlite.UpdatePost(postID, title, content, imageUrl, privacy, validViewers)
	if err != nil {
		http.Error(w, "Failed to update post", http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "Post updated")
}

func DeletePostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int64)
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		idStr = r.FormValue("id")
	}
	postID, _ := strconv.ParseInt(idStr, 10, 64)

	// Check ownership
	existing, err := sqlite.GetPostByID(postID)
	if err != nil || existing == nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}
	if existing.UserID != userID {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	err = sqlite.DeletePost(postID)
	if err != nil {
		http.Error(w, "Failed to delete post", http.StatusInternalServerError)
		return
	}

	// Delete image file from storage
	if existing.ImageURL != "" {
		utils.DeleteImage(existing.ImageURL, "./uploads")
	}

	fmt.Fprintf(w, "Post deleted")
}
