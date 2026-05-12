package models

import "time"

type ChatMessage struct {
	ID         int64     `json:"id"`
	SenderID   int64     `json:"sender_id"`
	ReceiverID int64     `json:"receiver_id"`
	Body       string    `json:"body"`
	CreatedAt  time.Time `json:"created_at"`
}

type ChatThread struct {
	PeerID      int64     `json:"peer_id"`
	FirstName   string    `json:"first_name"`
	LastName    string    `json:"last_name"`
	Nickname    string    `json:"nickname,omitempty"`
	Avatar      string    `json:"avatar,omitempty"`
	LastMessage string    `json:"last_message"`
	LastAt      time.Time `json:"last_at"`
	// Count of messages FROM the peer that arrived after the user's
	// chat_reads.last_read_at. Zero on fresh accounts (no chat_reads row yet
	// is treated as "everything read").
	UnreadCount int `json:"unread_count"`
}

type GroupChatMessage struct {
	ID              int64     `json:"id"`
	GroupID         int64     `json:"group_id"`
	SenderID        int64     `json:"sender_id"`
	SenderFirstName string    `json:"sender_first_name"`
	SenderLastName  string    `json:"sender_last_name"`
	Body            string    `json:"body"`
	CreatedAt       time.Time `json:"created_at"`
}
