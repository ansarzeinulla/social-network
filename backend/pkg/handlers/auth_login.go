package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gofrs/uuid"
	"golang.org/x/crypto/bcrypt"
)

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	json.NewDecoder(r.Body).Decode(&req)

	// ТУТ БУДЕТ SQL ЗАПРОС: достаем хэш пароля по email
	// SELECT password FROM users WHERE email = req.Email
	// Допустим, мы достали:
	hashFromDB := []byte("$2a$14$...")

	// Сравниваем пароли
	err := bcrypt.CompareHashAndPassword(hashFromDB, []byte(req.Password))
	if err != nil {
		http.Error(w, "Неверный пароль", http.StatusUnauthorized)
		return
	}

	// Генерируем уникальный токен сессии
	sessionToken, _ := uuid.NewV4()

	// ТУТ БУДЕТ SQL ЗАПРОС: сохраняем токен в БД
	// INSERT INTO sessions (token, user_id) VALUES (sessionToken.String(), user.ID)

	// ОТДАЕМ COOKIE БРАУЗЕРУ
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    sessionToken.String(),
		HttpOnly: true, // Фронтенд (JS) не сможет украсть куку, только браузер её видит
		Path:     "/",
	})

	json.NewEncoder(w).Encode(map[string]string{"message": "Logged in!"})
}
