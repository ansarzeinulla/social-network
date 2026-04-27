// Pattern test file. Copy this template when adding tests for a new module.
//
// Run from backend/: go test ./...
//
// TDD flow per the team's methodology:
//   1. Add a failing test case below for the new behavior.
//   2. Run `go test ./pkg/utils -run TestValidateRegistration` -> red.
//   3. Implement the minimum code in validate.go to make it pass -> green.
//   4. Refactor while keeping tests green.
package utils

import (
	"strings"
	"testing"

	"social-network/pkg/models"
)

func TestValidateEmail(t *testing.T) {
	cases := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{"valid simple", "a@b.co", false},
		{"valid plus", "user+tag@example.com", false},
		{"missing @", "userexample.com", true},
		{"empty", "", true},
		{"spaces", "user @example.com", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateEmail(tc.input)
			if (err != nil) != tc.wantErr {
				t.Fatalf("ValidateEmail(%q) err=%v wantErr=%v", tc.input, err, tc.wantErr)
			}
		})
	}
}

func TestValidateRegistration(t *testing.T) {
	good := models.User{
		Email:       "alice@example.com",
		Password:    "Secret1!",
		FirstName:   "Alice",
		LastName:    "Doe",
		DateOfBirth: "2000-01-15",
	}

	cases := []struct {
		name    string
		mutate  func(u *models.User)
		wantErr string // substring match; "" means no error
	}{
		{"all valid", func(u *models.User) {}, ""},
		{"bad email", func(u *models.User) { u.Email = "no-at-sign" }, "email"},
		{"short password", func(u *models.User) { u.Password = "abc" }, "password"},
		{"empty first name", func(u *models.User) { u.FirstName = "" }, "first name"},
		{"bad birth date", func(u *models.User) { u.DateOfBirth = "yesterday" }, "date"},
		{"too old", func(u *models.User) { u.DateOfBirth = "1900-01-01" }, "date"},
		// Optional fields (Step 1): nickname / about_me are allowed but bounded
		{"empty nickname is ok", func(u *models.User) { u.Nickname = "" }, ""},
		{"valid nickname", func(u *models.User) { u.Nickname = "alice_99" }, ""},
		{"too long nickname", func(u *models.User) { u.Nickname = strings.Repeat("a", 51) }, "nickname"},
		{"empty about_me is ok", func(u *models.User) { u.AboutMe = "" }, ""},
		{"valid about_me", func(u *models.User) { u.AboutMe = "I love Go and TDD." }, ""},
		{"too long about_me", func(u *models.User) { u.AboutMe = strings.Repeat("x", 501) }, "about"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			u := good
			tc.mutate(&u)
			err := ValidateRegistration(u)
			if tc.wantErr == "" {
				if err != nil {
					t.Fatalf("expected no error, got %v", err)
				}
				return
			}
			if err == nil {
				t.Fatalf("expected error containing %q, got nil", tc.wantErr)
			}
			if !strings.Contains(strings.ToLower(err.Error()), tc.wantErr) {
				t.Fatalf("expected error containing %q, got %q", tc.wantErr, err.Error())
			}
		})
	}
}
