package models

import "time"

type User struct {
	ID          int64     `json:"id"`
	Email       string    `json:"email"`
	Password    string    `json:"password,omitempty"` // for input only; never JSON-encode User directly — use ToPublic() for output
	FirstName   string    `json:"first_name"`
	LastName    string    `json:"last_name"`
	DateOfBirth string    `json:"date_of_birth"`
	Avatar      string    `json:"avatar,omitempty"`     // optional path to avatar
	Cover       string    `json:"cover,omitempty"`      // optional path to cover photo
	Nickname    string    `json:"nickname,omitempty"`   // optional public handle
	AboutMe     string    `json:"about_me,omitempty"`   // optional bio
	IsPublic    bool      `json:"is_public"`
	CreatedAt   time.Time `json:"created_at"`
}

// PublicUser is a safe view of a user that we expose to OTHER users.
// Use it when serializing followers, search results, profile-of-someone-else.
type PublicUser struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Nickname  string `json:"nickname,omitempty"`
	Avatar    string `json:"avatar,omitempty"`
	AboutMe   string `json:"about_me,omitempty"`
	IsPublic  bool   `json:"is_public"`
}

func (u *User) ToPublic() PublicUser {
	return PublicUser{
		ID:        u.ID,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Nickname:  u.Nickname,
		Avatar:    u.Avatar,
		AboutMe:   u.AboutMe,
		IsPublic:  u.IsPublic,
	}
}
