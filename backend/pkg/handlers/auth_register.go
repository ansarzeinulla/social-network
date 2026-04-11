package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/models"
	"social-network/pkg/utils"

	"github.com/gofrs/uuid"
	"golang.org/x/crypto/bcrypt"
)

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var req models.User
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := utils.ValidateRegistration(req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error processing password", http.StatusInternalServerError)
		return
	}

	req.Password = string(hashedPassword)

	userID, err := sqlite.CreateUser(req)
	if err != nil {
		http.Error(w, "User already exists or database error", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)

	sessionToken, _ := uuid.NewV4()
	tokenStr := sessionToken.String()

	sqlite.DeleteSessionByUserID(userID)

	err = sqlite.CreateSession(tokenStr, userID, 24*time.Hour)
	if err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    tokenStr,
		HttpOnly: true,
		Path:     "/",
		MaxAge:   86400, // 24h
		SameSite: http.SameSiteLaxMode,
	})

	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully"})
}
