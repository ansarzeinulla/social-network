package models

import "time"

type Group struct {
	ID           int64     `json:"id"`
	CreatorID    int64     `json:"creator_id"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	CreatedAt    time.Time `json:"created_at"`
	MembersCount int       `json:"members_count"`
	Joined       bool      `json:"joined"`  // caller is a confirmed member
	Pending      bool      `json:"pending"` // caller has 'requested' or been 'invited'
}
