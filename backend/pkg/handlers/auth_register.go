package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/models"
	"social-network/pkg/utils"

	"github.com/gofrs/uuid"
	"golang.org/x/crypto/bcrypt"
)

const avatarUploadDir = "./data/uploads"

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	user, err := parseRegistration(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := utils.ValidateRegistration(user); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error processing password", http.StatusInternalServerError)
		return
	}
	user.Password = string(hashedPassword)

	userID, err := sqlite.CreateUser(user)
	if err != nil {
		http.Error(w, "User already exists or database error", http.StatusConflict)
		return
	}

	sessionToken, _ := uuid.NewV4()
	tokenStr := sessionToken.String()
	sqlite.DeleteSessionByUserID(userID)
	if err := sqlite.CreateSession(tokenStr, userID, 24*time.Hour); err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    tokenStr,
		HttpOnly: true,
		Path:     "/",
		MaxAge:   86400,
		SameSite: http.SameSiteLaxMode,
	})

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully"})
}

// parseRegistration accepts either application/json or multipart/form-data.
// Multipart is used when the user uploads an avatar; JSON is the simple path.
func parseRegistration(r *http.Request) (models.User, error) {
	ct := r.Header.Get("Content-Type")
	if strings.HasPrefix(ct, "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			return models.User{}, err
		}
		u := models.User{
			Email:       r.FormValue("email"),
			Password:    r.FormValue("password"),
			FirstName:   r.FormValue("first_name"),
			LastName:    r.FormValue("last_name"),
			DateOfBirth: r.FormValue("date_of_birth"),
			Nickname:    r.FormValue("nickname"),
			AboutMe:     r.FormValue("about_me"),
		}
		avatarURL, err := utils.ProcessImageUpload(r, "avatar", avatarUploadDir)
		if err != nil {
			return models.User{}, err
		}
		u.Avatar = avatarURL
		return u, nil
	}
	// Default: JSON
	var u models.User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		return models.User{}, err
	}
	return u, nil
}
