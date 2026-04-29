package models

import "time"

type Group struct {
	ID                 int64     `json:"id"`
	CreatorID          int64     `json:"creator_id"`
	CreatorFirstName   string    `json:"creator_first_name"`
	CreatorLastName    string    `json:"creator_last_name"`
	CreatorNickname    string    `json:"creator_nickname,omitempty"`
	Title              string    `json:"title"`
	Description        string    `json:"description"`
	CreatedAt          time.Time `json:"created_at"`
	MembersCount       int       `json:"members_count"`
	Joined             bool      `json:"joined"`
	Pending            bool      `json:"pending"`
}
