package handlers

import (
	"encoding/json"
	"net/http"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/models"
	"social-network/pkg/utils"

	"golang.org/x/crypto/bcrypt"
)

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var req models.User
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
	if err := utils.ValidatePasswordCharacters(req.Password); err != nil {
		http.Error(w, "Invalid password characters", http.StatusBadRequest)
		return
	}
	if err := utils.ValidateLength(req.Password, 6, 50); err != nil {
		http.Error(w, "Password must be 6-50 characters", http.StatusBadRequest)
		return
	}
	if err := utils.ValidateNameCharacters(req.FirstName); err != nil {
		http.Error(w, "Invalid first name characters", http.StatusBadRequest)
		return
	}
	if err := utils.ValidateLength(req.FirstName, 2, 50); err != nil {
		http.Error(w, "First name must be 2-50 characters", http.StatusBadRequest)
		return
	}
	if err := utils.ValidateNameCharacters(req.LastName); err != nil {
		http.Error(w, "Invalid last name characters", http.StatusBadRequest)
		return
	}
	if err := utils.ValidateLength(req.LastName, 2, 50); err != nil {
		http.Error(w, "Last name must be 2-50 characters", http.StatusBadRequest)
		return
	}
	if err := utils.ValidateDate(req.DateOfBirth); err != nil {
		http.Error(w, "Invalid date format", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error processing password", http.StatusInternalServerError)
		return
	}

	req.Password = string(hashedPassword)

	_, err = sqlite.CreateUser(req)
	if err != nil {
		http.Error(w, "User already exists or database error", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully"})
}
