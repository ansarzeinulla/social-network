package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
	"social-network/pkg/utils"
)

// GET  /api/posts/{postID}/comments
// POST /api/posts/{postID}/comments  { "content": "...", "image_url": "..." (opt) }
// POST /api/posts/{postID}/comments  multipart/form-data with content + image
func PostCommentsHandler(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/posts/")
	rest = strings.TrimSuffix(rest, "/comments")
	postID, err := strconv.ParseInt(rest, 10, 64)
	if err != nil || postID == 0 {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		userID := r.Context().Value(middleware.UserIDKey).(int64)
		post, err := sqlite.GetPostByID(postID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		if post == nil {
			http.Error(w, "post not found", http.StatusNotFound)
			return
		}
		if !canViewPost(userID, post) {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		out, err := sqlite.ListComments(postID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, out)

	case http.MethodPost:
		userID := r.Context().Value(middleware.UserIDKey).(int64)
		post, err := sqlite.GetPostByID(postID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		if post == nil {
			http.Error(w, "post not found", http.StatusNotFound)
			return
		}
		if !canViewPost(userID, post) {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		content, imageURL, err := parseCommentBody(r)
		if err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		if content == "" && imageURL == "" {
			http.Error(w, "content required", http.StatusBadRequest)
			return
		}
		id, err := sqlite.CreateComment(postID, userID, content, imageURL)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]int64{"id": id})

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func parseCommentBody(r *http.Request) (string, string, error) {
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			return "", "", err
		}
		imageURL, err := utils.ProcessImageUpload(r, "image", "./data/uploads")
		if err != nil {
			return "", "", err
		}
		return r.FormValue("content"), imageURL, nil
	}

	var body struct {
		Content  string `json:"content"`
		ImageURL string `json:"image_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		return "", "", err
	}
	return body.Content, body.ImageURL, nil
}
