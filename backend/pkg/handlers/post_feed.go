package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/models"
)

func GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page, _ := strconv.Atoi(pageStr)
	if page < 1 || page > 1000 {
		page = 1
	}

	limit, _ := strconv.Atoi(limitStr)
	if limit < 1 || limit > 30 {
		limit = 30
	}

	offset := (page - 1) * limit
	whereClause := ""
	var args []interface{}

	// Total count for pagination
	var totalCount int
	countQuery := "SELECT COUNT(*) FROM posts " + whereClause
	err := sqlite.DB.QueryRow(countQuery, args...).Scan(&totalCount)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Fetch posts with user info
	query := `
		SELECT p.id, p.user_id, p.title, p.content, p.image_url, p.privacy, p.created_at, u.first_name, u.last_name
		FROM posts p
		JOIN users u ON p.user_id = u.id
		` + whereClause + `
		ORDER BY p.created_at DESC
		LIMIT ? OFFSET ?
	`
	args = append(args, limit, offset)
	rows, err := sqlite.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var p models.Post
		var imageUrl *string // handle nullable image_url
		err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Content, &imageUrl, &p.Privacy, &p.CreatedAt, &p.FirstName, &p.LastName)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		if imageUrl != nil {
			p.ImageURL = *imageUrl
		}
		posts = append(posts, p)
	}

	response := models.PostFeedResponse{
		Posts:      posts,
		TotalCount: totalCount,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
