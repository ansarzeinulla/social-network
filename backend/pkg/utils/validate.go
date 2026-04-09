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
	_, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return errors.New("invalid date format (use YYYY-MM-DD)")
	}
	if dateStr < time.Now().Format("1950-01-01") {
		return errors.New("Too old to use!")
	}
	if dateStr > time.Now().Format("2020-01-01") {
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
