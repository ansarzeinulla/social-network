package utils

import (
	"errors"
	"net/mail"
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

func ValidateDate(dateStr string) error {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return errors.New("invalid date format (use DD.MM.YYYY)")
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
