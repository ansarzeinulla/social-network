package models

import "time"

type Post struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	ImageURL  string    `json:"image_url"`
	Privacy   string    `json:"privacy"`
	CreatedAt time.Time `json:"created_at"`

	// Joined fields
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type PostFeedResponse struct {
	Posts     []Post `json:"posts"`
	PageCount int    `json:"page_count"`
}
