package models

import "time"

type Group struct {
	ID               int64     `json:"id"`
	CreatorID        int64     `json:"creator_id"`
	CreatorFirstName string    `json:"creator_first_name"`
	CreatorLastName  string    `json:"creator_last_name"`
	CreatorNickname  string    `json:"creator_nickname,omitempty"`
	Title            string    `json:"title"`
	Description      string    `json:"description"`
	CreatedAt        time.Time `json:"created_at"`
	MembersCount     int       `json:"members_count"`
	Joined           bool      `json:"joined"`
	Pending          bool      `json:"pending"`
	Status           string    `json:"status,omitempty"`
	// Unread group chat messages for the caller. Always 0 for non-members.
	UnreadCount int `json:"unread_count"`
}

type GroupPost struct {
	ID        int64     `json:"id"`
	GroupID   int64     `json:"group_id"`
	UserID    int64     `json:"user_id"`
	Content   string    `json:"content"`
	ImageURL  string    `json:"image_url,omitempty"`
	CreatedAt time.Time `json:"created_at"`

	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Nickname  string `json:"nickname,omitempty"`
	Avatar    string `json:"avatar,omitempty"`
}

type GroupComment struct {
	ID          int64     `json:"id"`
	GroupPostID int64     `json:"group_post_id"`
	UserID      int64     `json:"user_id"`
	Content     string    `json:"content"`
	ImageURL    string    `json:"image_url,omitempty"`
	CreatedAt   time.Time `json:"created_at"`

	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Nickname  string `json:"nickname,omitempty"`
	Avatar    string `json:"avatar,omitempty"`
}

type GroupEvent struct {
	ID          int64     `json:"id"`
	GroupID     int64     `json:"group_id"`
	CreatorID   int64     `json:"creator_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	EventDate   time.Time `json:"event_date"`
	CreatedAt   time.Time `json:"created_at"`
	MyVote      string    `json:"my_vote,omitempty"`
	Going       int       `json:"going"`
	NotGoing    int       `json:"not_going"`
	Options     []string  `json:"options"`
}
