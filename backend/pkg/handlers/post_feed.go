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
	page, _ := strconv.Atoi(pageStr)
	if page < 1 {
		page = 1
	}

	title := r.URL.Query().Get("title")
	if err := utils.ValidateLength(title, 0, 100); err != nil {
		http.Error(w, "Title filter too long", http.StatusBadRequest)
		return
	}

	startDate := r.URL.Query().Get("startDate")
	endDate := r.URL.Query().Get("endDate")
	privacy := r.URL.Query().Get("privacy")

	// Validate privacy
	if privacy != "" && privacy != "public" && privacy != "almost_private" && privacy != "private" {
		http.Error(w, "Invalid privacy filter", http.StatusBadRequest)
		return
	}

	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	posts, pageCount, err := sqlite.GetPostsByUserIDandFilters(userID, title, startDate, endDate, privacy, page, 30)
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
