package models

import "time"

type Notification struct {
	ID              int64     `json:"id"`
	ReceiverID      int64     `json:"receiver_id"`
	SenderID        int64     `json:"sender_id"`
	SenderFirstName string    `json:"sender_first_name"`
	SenderLastName  string    `json:"sender_last_name"`
	SenderNickname  string    `json:"sender_nickname,omitempty"`
	Type            string    `json:"type"`      // follow_request | group_invite | group_request | new_event
	EntityID        *int64    `json:"entity_id"` // nullable: group_id or event_id depending on Type
	IsRead          bool      `json:"is_read"`
	CreatedAt       time.Time `json:"created_at"`
}
