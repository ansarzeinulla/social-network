package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
	"social-network/pkg/models"
	"social-network/pkg/utils"
)

func GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pageStr := r.URL.Query().Get("page")
	contentFilter := r.URL.Query().Get("content")
	if contentFilter == "" {
		contentFilter = r.URL.Query().Get("title") // backwards-compat: old front sends ?title=
	}
	startDate := r.URL.Query().Get("startDate")
	endDate := r.URL.Query().Get("endDate")
	privacy := r.URL.Query().Get("privacy")
	page, err := utils.ValidatePostFilters(pageStr, contentFilter, startDate, endDate, privacy)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	posts, pageCount, err := sqlite.GetPostsByUserIDandFilters(userID, contentFilter, startDate, endDate, privacy, page, 30)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	response := models.PostFeedResponse{
		Posts:     posts,
		PageCount: pageCount,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GET /api/users/{id}/posts?page=1
// Returns posts authored by the user, visible to the caller.
func UserPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	authorID, err := pathID(r.URL.Path, "/api/users/", "/posts")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	callerID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	page := 1
	if p := r.URL.Query().Get("page"); p != "" {
		if n, err := strconv.Atoi(p); err == nil && n >= 1 {
			page = n
		}
	}

	posts, pageCount, err := sqlite.GetPostsByAuthor(authorID, callerID, page, 30)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.PostFeedResponse{Posts: posts, PageCount: pageCount})
}
