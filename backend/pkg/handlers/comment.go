package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
)

// GET  /api/posts/{postID}/comments
// POST /api/posts/{postID}/comments  { "content": "...", "image_url": "..." (opt) }
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
		out, err := sqlite.ListComments(postID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, out)

	case http.MethodPost:
		userID := r.Context().Value(middleware.UserIDKey).(int64)
		var body struct {
			Content  string `json:"content"`
			ImageURL string `json:"image_url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		if body.Content == "" {
			http.Error(w, "content required", http.StatusBadRequest)
			return
		}
		id, err := sqlite.CreateComment(postID, userID, body.Content, body.ImageURL)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]int64{"id": id})

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}
