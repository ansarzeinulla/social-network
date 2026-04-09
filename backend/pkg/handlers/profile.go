package handlers

import (
	"encoding/json"
	"net/http"
	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
)

func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "Could not find user in context", http.StatusUnauthorized)
		return
	}

	user, err := sqlite.GetUserByID(userID)
	if err != nil || user == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Don't send password!
	resp := map[string]interface{}{
		"id":         user.ID,
		"email":      user.Email,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
	}

	json.NewEncoder(w).Encode(resp)
}
