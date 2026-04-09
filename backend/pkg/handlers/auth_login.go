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

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req models.UserShort
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := utils.ValidateEmail(req.Email); err != nil {
		http.Error(w, "Invalid email format", http.StatusBadRequest)
		return
	}
	if err := utils.ValidateLength(req.Email, 3, 30); err != nil {
		http.Error(w, "Email must be 3-30 characters", http.StatusBadRequest)
		return
	}

	if err := utils.ValidateLength(req.Password, 6, 50); err != nil {
		http.Error(w, "Invalid password length", http.StatusBadRequest)
		return
	}
	if err := utils.ValidateAllowedCharacters(req.Password, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;':\",./<>?"); err != nil {
		http.Error(w, "Invalid password characters", http.StatusBadRequest)
		return
	}

	user, err := sqlite.GetUserByEmail(req.Email)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if user == nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		http.Error(w, "Invalid password", http.StatusUnauthorized)
		return
	}

	sessionToken, _ := uuid.NewV4()
	tokenStr := sessionToken.String()

	err = sqlite.CreateSession(tokenStr, user.ID, 24*time.Hour)
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

	json.NewEncoder(w).Encode(map[string]string{"message": "Logged in!"})
}
