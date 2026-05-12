package models

import "time"

type Post struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Content   string    `json:"content"`
	ImageURL  string    `json:"image_url,omitempty"`
	Privacy   string    `json:"privacy"`
	CreatedAt time.Time `json:"created_at"`

	// Joined author info — denormalized for list rendering.
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Nickname  string `json:"nickname,omitempty"`
	Avatar    string `json:"avatar,omitempty"`

	// Like state — populated by handlers after reading the post row.
	LikesCount    int  `json:"likes_count"`
	IsLiked       bool `json:"is_liked"`
	CommentsCount int  `json:"comments_count"`
}

type PostFeedResponse struct {
	Posts     []Post `json:"posts"`
	PageCount int    `json:"page_count"`
}
