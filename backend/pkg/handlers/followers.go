package handlers

import (
	"encoding/json"
	"net/http"
	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
)

func FollowersHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int64)

	followers, err := sqlite.GetFollowersOfUser(userID)
	if err != nil {
		http.Error(w, "Database error fetching followers", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(followers)
}
