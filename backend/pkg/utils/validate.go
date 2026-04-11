package utils

import (
	"errors"
	"net/mail"
	"social-network/pkg/models"
	"strconv"
	"strings"
	"time"
)

func ValidateEmail(email string) error {
	_, err := mail.ParseAddress(email)
	if err != nil {
		return errors.New("invalid email format")
	}
	return nil
}

func ValidateLength(value string, min, max int) error {
	length := len(value)
	if length < min || length > max {
		return errors.New("invalid length")
	}
	return nil
}

func ValidateBirthDate(dateStr string) error {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return errors.New("invalid date format (use YYYY-MM-DD)")
	}
	if t.Before(time.Date(1950, 1, 1, 0, 0, 0, 0, time.UTC)) {
		return errors.New("Too old to use!")
	}
	if t.After(time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)) {
		return errors.New("Too young to use!")
	}
	return nil
}

func ValidateAllowedCharacters(value string, allowed string) error {
	for _, char := range value {
		if !strings.ContainsRune(allowed, char) {
			return errors.New("invalid characters")
		}
	}
	return nil
}

func ValidateNameCharacters(name string) error {
	allowed := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ -_"
	return ValidateAllowedCharacters(name, allowed)
}

func ValidatePasswordCharacters(password string) error {
	allowed := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;':\",./<>?"
	return ValidateAllowedCharacters(password, allowed)
}

func ValidateDate(dateStr string) error {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return errors.New("invalid date format (use YYYY-MM-DD)")
	}
	if t.Before(time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)) {
		return errors.New("Too past!")
	}
	if t.After(time.Date(2030, 1, 1, 0, 0, 0, 0, time.UTC)) {
		return errors.New("Too future!")
	}
	return nil
}

func ValidateLogin(email, password string) error {
	if err := ValidateEmail(email); err != nil {
		return errors.New("Invalid email format")
	}
	if err := ValidateLength(email, 3, 30); err != nil {
		return errors.New("Email must be 3-30 characters")
	}
	if err := ValidateLength(password, 6, 50); err != nil {
		return errors.New("Invalid password length")
	}
	if err := ValidatePasswordCharacters(password); err != nil {
		return errors.New("Invalid password characters")
	}
	return nil
}

func ValidateRegistration(req models.User) error {
	if err := ValidateEmail(req.Email); err != nil {
		return errors.New("Invalid email format")
	}
	if err := ValidateLength(req.Email, 3, 30); err != nil {
		return errors.New("Email must be 3-30 characters")
	}
	if err := ValidatePasswordCharacters(req.Password); err != nil {
		return errors.New("Invalid password characters")
	}
	if err := ValidateLength(req.Password, 6, 50); err != nil {
		return errors.New("Password must be 6-50 characters")
	}
	if err := ValidateNameCharacters(req.FirstName); err != nil {
		return errors.New("Invalid first name characters")
	}
	if err := ValidateLength(req.FirstName, 2, 50); err != nil {
		return errors.New("First name must be 2-50 characters")
	}
	if err := ValidateNameCharacters(req.LastName); err != nil {
		return errors.New("Invalid last name characters")
	}
	if err := ValidateLength(req.LastName, 2, 50); err != nil {
		return errors.New("Last name must be 2-50 characters")
	}
	if err := ValidateBirthDate(req.DateOfBirth); err != nil {
		return errors.New("Invalid date format")
	}
	return nil
}

func ValidatePostFilters(pageStr, title, startDate, endDate, privacy string) (int, error) {
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		return 0, errors.New("Invalid page format")
	}
	if page < 1 {
		return 0, errors.New("Page must be at least 1")
	}
	if err := ValidateLength(title, 0, 100); err != nil {
		return 0, errors.New("Title filter too long")
	}
	if privacy != "" && privacy != "public" && privacy != "almost_private" && privacy != "private" {
		return 0, errors.New("Invalid privacy filter")
	}
	if startDate != "" {
		if err := ValidateDate(startDate); err != nil {
			return 0, errors.New("Invalid start date")
		}
	}
	if endDate != "" {
		if err := ValidateDate(endDate); err != nil {
			return 0, errors.New("Invalid end date")
		}
	}
	return page, nil
}

func ValidateCreatePost(title, content string, privacy string) error {
	if err := ValidateLength(title, 1, 100); err != nil {
		return errors.New("Title must be between 1 and 100 characters")
	}
	if err := ValidateLength(content, 1, 10000); err != nil {
		return errors.New("Content must be between 1 and 10000 characters")
	}
	if privacy != "public" && privacy != "almost_private" && privacy != "private" {
		return errors.New("Invalid privacy setting")
	}
	return nil
}

func ValidatePostViewers(privacy string, viewers []string, followers []models.User) ([]int64, error) {
	if privacy != "private" {
		return nil, nil
	}

	followerMap := make(map[int64]bool)
	for _, f := range followers {
		followerMap[f.ID] = true
	}

	var validViewers []int64
	for _, vIDStr := range viewers {
		vID, err := strconv.ParseInt(vIDStr, 10, 64)
		if err != nil {
			return nil, errors.New("Invalid viewer ID format")
		}
		if !followerMap[vID] {
			return nil, errors.New("Selected viewer must be a follower")
		}
		validViewers = append(validViewers, vID)
	}
	return validViewers, nil
}
