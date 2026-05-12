package sqlite

import "social-network/pkg/models"

// TogglePostLike inserts a (user_id, post_id) row if absent, deletes it if
// present. Returns the new "liked" state and the updated total count of likes
// on that post. Idempotent under repeated calls — caller decides intent by
// reading the returned `liked` flag.
func TogglePostLike(userID, postID int64) (liked bool, count int, err error) {
	res, err := DB.Exec(`DELETE FROM post_likes WHERE user_id = ? AND post_id = ?`, userID, postID)
	if err != nil {
		return false, 0, err
	}
	deleted, _ := res.RowsAffected()
	if deleted > 0 {
		liked = false
	} else {
		if _, err = DB.Exec(`INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)`, userID, postID); err != nil {
			return false, 0, err
		}
		liked = true
	}
	err = DB.QueryRow(`SELECT COUNT(*) FROM post_likes WHERE post_id = ?`, postID).Scan(&count)
	return liked, count, err
}

// PostLikesCount returns the total number of likes on a single post.
func PostLikesCount(postID int64) (int, error) {
	var n int
	err := DB.QueryRow(`SELECT COUNT(*) FROM post_likes WHERE post_id = ?`, postID).Scan(&n)
	return n, err
}

// HasUserLikedPost returns whether the given user has liked the given post.
func HasUserLikedPost(userID, postID int64) (bool, error) {
	var n int
	err := DB.QueryRow(`SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ? LIMIT 1`, userID, postID).Scan(&n)
	if err != nil {
		// sql.ErrNoRows -> not liked. Any other error propagates.
		if err.Error() == "sql: no rows in result set" {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// PostsLikesSummary returns, for each given post id, the total likes count and
// whether `userID` liked it. Two map results keyed by post id. Used to enrich
// feed responses in a single DB round-trip per metric.
func PostsLikesSummary(userID int64, postIDs []int64) (counts map[int64]int, likedByMe map[int64]bool, err error) {
	counts = make(map[int64]int)
	likedByMe = make(map[int64]bool)
	if len(postIDs) == 0 {
		return counts, likedByMe, nil
	}

	// Build ?,?,? placeholders for the IN clause.
	placeholders := ""
	args := make([]interface{}, 0, len(postIDs)+1)
	for i, id := range postIDs {
		if i > 0 {
			placeholders += ","
		}
		placeholders += "?"
		args = append(args, id)
	}

	// Counts
	countRows, err := DB.Query(`SELECT post_id, COUNT(*) FROM post_likes WHERE post_id IN (`+placeholders+`) GROUP BY post_id`, args...)
	if err != nil {
		return nil, nil, err
	}
	for countRows.Next() {
		var pid int64
		var c int
		if err := countRows.Scan(&pid, &c); err != nil {
			countRows.Close()
			return nil, nil, err
		}
		counts[pid] = c
	}
	countRows.Close()

	// Liked-by-me
	likedArgs := append([]interface{}{userID}, args...)
	likedRows, err := DB.Query(`SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (`+placeholders+`)`, likedArgs...)
	if err != nil {
		return nil, nil, err
	}
	defer likedRows.Close()
	for likedRows.Next() {
		var pid int64
		if err := likedRows.Scan(&pid); err != nil {
			return nil, nil, err
		}
		likedByMe[pid] = true
	}
	return counts, likedByMe, nil
}

// PostsCommentsCount returns a map of post id -> comment count for the given
// post ids. Empty input -> empty map. Used to enrich feed responses.
func PostsCommentsCount(postIDs []int64) (map[int64]int, error) {
	out := make(map[int64]int)
	if len(postIDs) == 0 {
		return out, nil
	}
	placeholders := ""
	args := make([]interface{}, 0, len(postIDs))
	for i, id := range postIDs {
		if i > 0 {
			placeholders += ","
		}
		placeholders += "?"
		args = append(args, id)
	}
	rows, err := DB.Query(`SELECT post_id, COUNT(*) FROM comments WHERE post_id IN (`+placeholders+`) GROUP BY post_id`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var pid int64
		var c int
		if err := rows.Scan(&pid, &c); err != nil {
			return nil, err
		}
		out[pid] = c
	}
	return out, nil
}

// GetPostLikers returns the users who have liked the given post, ordered by
// most recent like first. Returns lightweight PublicUser records (no email /
// password / dob) for rendering in a likes modal/list.
func GetPostLikers(postID int64) ([]models.PublicUser, error) {
	rows, err := DB.Query(`
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar, '')
		FROM post_likes pl
		JOIN users u ON u.id = pl.user_id
		WHERE pl.post_id = ?
		ORDER BY pl.created_at DESC`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.PublicUser{}
	for rows.Next() {
		var u models.PublicUser
		if err := rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Nickname, &u.Avatar); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, nil
}
