package sqlite

import (
	"database/sql"
	"social-network/pkg/models"
)

func ListComments(postID int64) ([]models.Comment, error) {
	rows, err := DB.Query(`
		SELECT c.id, c.post_id, c.user_id, c.content, c.image_url, c.created_at,
		       u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar, '')
		FROM comments c
		JOIN users u ON u.id = c.user_id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.Comment
	for rows.Next() {
		var c models.Comment
		var img sql.NullString
		if err := rows.Scan(&c.ID, &c.PostID, &c.UserID, &c.Content, &img, &c.CreatedAt,
			&c.FirstName, &c.LastName, &c.Nickname, &c.Avatar); err != nil {
			return nil, err
		}
		if img.Valid {
			c.ImageURL = img.String
		}
		out = append(out, c)
	}
	return out, nil
}

func CreateComment(postID, userID int64, content, imageURL string) (int64, error) {
	res, err := DB.Exec(
		`INSERT INTO comments (post_id, user_id, content, image_url) VALUES (?, ?, ?, ?)`,
		postID, userID, content, nullIfEmpty(imageURL),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}
