package sqlite

import (
	"database/sql"
	"math"
	"social-network/pkg/models"
	"strings"
)

// Internal helper for common query logic
func fetchPostsWithFilters(queryBase string, args []interface{}, page, limit int) ([]models.Post, int, error) {
	// Count total
	countQuery := "SELECT COUNT(*) FROM (" + queryBase + ")"
	var totalCount int
	err := DB.QueryRow(countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, err
	}

	pageCount := int(math.Ceil(float64(totalCount) / float64(limit)))
	if pageCount == 0 {
		pageCount = 1
	}

	offset := (page - 1) * limit
	finalQuery := queryBase + " ORDER BY p.created_at DESC LIMIT ? OFFSET ?"
	finalArgs := append(args, limit, offset)

	rows, err := DB.Query(finalQuery, finalArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var p models.Post
		var imageUrl sql.NullString
		err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Content, &imageUrl, &p.Privacy, &p.CreatedAt, &p.FirstName, &p.LastName)
		if err != nil {
			return nil, 0, err
		}
		if imageUrl.Valid {
			p.ImageURL = imageUrl.String
		}
		posts = append(posts, p)
	}
	return posts, pageCount, nil
}

func buildFilters(title, startDate, endDate string) (string, []interface{}) {
	var clauses []string
	var args []interface{}
	if title != "" {
		clauses = append(clauses, "p.title LIKE ?")
		args = append(args, "%"+title+"%")
	}
	if startDate != "" {
		clauses = append(clauses, "p.created_at >= ?")
		args = append(args, startDate)
	}
	if endDate != "" {
		clauses = append(clauses, "p.created_at <= ?")
		args = append(args, endDate+" 23:59:59")
	}
	if len(clauses) > 0 {
		return " AND " + strings.Join(clauses, " AND "), args
	}
	return "", args
}

func GetPublicPostsByUserIDandFilter(userID int64, title, startDate, endDate string, page, limit int) ([]models.Post, int, error) {
	filterClause, args := buildFilters(title, startDate, endDate)
	query := `
		SELECT p.id, p.user_id, p.title, p.content, p.image_url, p.privacy, p.created_at, u.first_name, u.last_name
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE p.privacy = 'public'` + filterClause
	return fetchPostsWithFilters(query, args, page, limit)
}

func GetAlmostPrivatePostsByUserIDandFilter(userID int64, title, startDate, endDate string, page, limit int) ([]models.Post, int, error) {
	filterClause, args := buildFilters(title, startDate, endDate)
	// Visible if: I am the author OR I follow the author (accepted)
	query := `
		SELECT p.id, p.user_id, p.title, p.content, p.image_url, p.privacy, p.created_at, u.first_name, u.last_name
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE p.privacy = 'almost_private'
		AND (p.user_id = ? OR EXISTS (
			SELECT 1 FROM followers f 
			WHERE f.follower_id = ? AND f.followee_id = p.user_id AND f.status = 'accepted'
		))` + filterClause

	finalArgs := append([]interface{}{userID, userID}, args...)
	return fetchPostsWithFilters(query, finalArgs, page, limit)
}

func GetPrivatePostsByUserIDandFilter(userID int64, title, startDate, endDate string, page, limit int) ([]models.Post, int, error) {
	filterClause, args := buildFilters(title, startDate, endDate)
	// Visible if: I am the author OR I am in post_viewers (pretending table exists)
	query := `
		SELECT p.id, p.user_id, p.title, p.content, p.image_url, p.privacy, p.created_at, u.first_name, u.last_name
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE p.privacy = 'private'
		AND (p.user_id = ? OR EXISTS (
			SELECT 1 FROM post_viewers pv 
			WHERE pv.post_id = p.id AND pv.user_id = ?
		))` + filterClause

	finalArgs := append([]interface{}{userID, userID}, args...)
	return fetchPostsWithFilters(query, finalArgs, page, limit)
}

// Keep the general one if needed, but the user asked for 3 independent ones.
func GetPostsByUserIDandFilters(userID int64, title, startDate, endDate, privacy string, page, limit int) ([]models.Post, int, error) {
	switch privacy {
	case "public":
		return GetPublicPostsByUserIDandFilter(userID, title, startDate, endDate, page, limit)
	case "almost_private":
		return GetAlmostPrivatePostsByUserIDandFilter(userID, title, startDate, endDate, page, limit)
	case "private":
		return GetPrivatePostsByUserIDandFilter(userID, title, startDate, endDate, page, limit)
	default:
		return GetPublicPostsByUserIDandFilter(userID, title, startDate, endDate, page, limit)
	}
}

func CreatePost(userID int64, title, content, imageUrl, privacy string, viewers []int64) (int64, error) {
	tx, err := DB.Begin()
	if err != nil {
		return 0, err
	}

	query := `INSERT INTO posts (user_id, title, content, image_url, privacy) VALUES (?, ?, ?, ?, ?)`
	res, err := tx.Exec(query, userID, title, content, imageUrl, privacy)
	if err != nil {
		tx.Rollback()
		return 0, err
	}

	postID, _ := res.LastInsertId()

	if privacy == "private" {
		for _, vID := range viewers {
			_, err = tx.Exec(`INSERT INTO post_viewers (post_id, user_id) VALUES (?, ?)`, postID, vID)
			if err != nil {
				tx.Rollback()
				return 0, err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return postID, nil
}
