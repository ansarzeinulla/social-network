package sqlite

import (
	"database/sql"
	"social-network/pkg/models"
	"strings"
)

// SearchResults bundles results across all entity types. Each list is capped
// at a small limit (20 items) — this is a quick-search, not a full-text
// engine. The caller decides which buckets to populate based on the `kind`
// query param.
type SearchResults struct {
	Users    []models.PublicUser   `json:"users"`
	Posts    []models.Post         `json:"posts"`
	Comments []SearchCommentHit    `json:"comments"`
	Messages []SearchMessageHit    `json:"messages"`
}

// SearchCommentHit — comment plus the parent post id so the UI can deep-link
// straight to the post page.
type SearchCommentHit struct {
	ID          int64  `json:"id"`
	PostID      int64  `json:"post_id"`
	UserID      int64  `json:"user_id"`
	Content     string `json:"content"`
	CreatedAt   string `json:"created_at"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Nickname    string `json:"nickname,omitempty"`
	Avatar      string `json:"avatar,omitempty"`
}

// SearchMessageHit — private chat message, plus the peer info needed to render
// "Из чата с X" and link to /chats/{peerID}.
type SearchMessageHit struct {
	ID        int64  `json:"id"`
	SenderID  int64  `json:"sender_id"`
	PeerID    int64  `json:"peer_id"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
	PeerFirstName string `json:"peer_first_name"`
	PeerLastName  string `json:"peer_last_name"`
	PeerNickname  string `json:"peer_nickname,omitempty"`
	PeerAvatar    string `json:"peer_avatar,omitempty"`
}

const searchLimit = 20

// SearchUsers — name / nickname / last name prefix search.
func SearchUsers(query string) ([]models.PublicUser, error) {
	pattern := "%" + escapeLike(strings.ToLower(query)) + "%"
	rows, err := DB.Query(`
		SELECT id, first_name, last_name, COALESCE(nickname, ''), COALESCE(avatar, ''),
		       COALESCE(about_me, ''), is_public
		FROM users
		WHERE LOWER(first_name) LIKE ? ESCAPE '\'
		   OR LOWER(last_name)  LIKE ? ESCAPE '\'
		   OR LOWER(COALESCE(nickname, '')) LIKE ? ESCAPE '\'
		ORDER BY first_name, last_name
		LIMIT ?`, pattern, pattern, pattern, searchLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.PublicUser{}
	for rows.Next() {
		var u models.PublicUser
		if err := rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Nickname, &u.Avatar, &u.AboutMe, &u.IsPublic); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, nil
}

// SearchPosts — content search, respects the same privacy rules as feed:
// public, or own, or almost_private+follower, or private+viewer.
func SearchPosts(userID int64, query string) ([]models.Post, error) {
	pattern := "%" + escapeLike(strings.ToLower(query)) + "%"
	rows, err := DB.Query(`
		SELECT p.id, p.user_id, p.content, p.image_url, p.privacy, p.created_at,
		       u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar, '')
		FROM posts p
		JOIN users u ON u.id = p.user_id
		WHERE LOWER(p.content) LIKE ? ESCAPE '\'
		  AND (
		    p.privacy = 'public'
		    OR p.user_id = ?
		    OR (p.privacy = 'almost_private' AND EXISTS (
		        SELECT 1 FROM followers f
		        WHERE f.follower_id = ? AND f.followee_id = p.user_id AND f.status = 'accepted'
		    ))
		    OR (p.privacy = 'private' AND EXISTS (
		        SELECT 1 FROM post_viewers pv
		        WHERE pv.post_id = p.id AND pv.user_id = ?
		    ))
		  )
		ORDER BY p.created_at DESC
		LIMIT ?`, pattern, userID, userID, userID, searchLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Post{}
	for rows.Next() {
		var p models.Post
		var img sql.NullString
		if err := rows.Scan(&p.ID, &p.UserID, &p.Content, &img, &p.Privacy, &p.CreatedAt,
			&p.FirstName, &p.LastName, &p.Nickname, &p.Avatar); err != nil {
			return nil, err
		}
		if img.Valid {
			p.ImageURL = img.String
		}
		out = append(out, p)
	}
	return out, nil
}

// SearchComments — only on posts the caller can see (post-level privacy
// inheritance). Returns content + author + parent post id.
func SearchComments(userID int64, query string) ([]SearchCommentHit, error) {
	pattern := "%" + escapeLike(strings.ToLower(query)) + "%"
	rows, err := DB.Query(`
		SELECT c.id, c.post_id, c.user_id, c.content, c.created_at,
		       u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar, '')
		FROM comments c
		JOIN users u ON u.id = c.user_id
		JOIN posts p ON p.id = c.post_id
		WHERE LOWER(c.content) LIKE ? ESCAPE '\'
		  AND (
		    p.privacy = 'public'
		    OR p.user_id = ?
		    OR (p.privacy = 'almost_private' AND EXISTS (
		        SELECT 1 FROM followers f
		        WHERE f.follower_id = ? AND f.followee_id = p.user_id AND f.status = 'accepted'
		    ))
		    OR (p.privacy = 'private' AND EXISTS (
		        SELECT 1 FROM post_viewers pv
		        WHERE pv.post_id = p.id AND pv.user_id = ?
		    ))
		  )
		ORDER BY c.created_at DESC
		LIMIT ?`, pattern, userID, userID, userID, searchLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []SearchCommentHit{}
	for rows.Next() {
		var h SearchCommentHit
		if err := rows.Scan(&h.ID, &h.PostID, &h.UserID, &h.Content, &h.CreatedAt,
			&h.FirstName, &h.LastName, &h.Nickname, &h.Avatar); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, nil
}

// SearchMessages — private chat history search, scoped to threads the caller
// is part of (sender or receiver). Resolves the "peer" of each message (the
// OTHER party of the 1:1 chat) so the UI can label which conversation it's
// from and link to /chats/{peerID}.
func SearchMessages(userID int64, query string) ([]SearchMessageHit, error) {
	pattern := "%" + escapeLike(strings.ToLower(query)) + "%"
	rows, err := DB.Query(`
		SELECT c.id, c.sender_id,
		       CASE WHEN c.sender_id = ?1 THEN c.receiver_id ELSE c.sender_id END AS peer_id,
		       c.content, c.created_at,
		       peer.first_name, peer.last_name,
		       COALESCE(peer.nickname, ''), COALESCE(peer.avatar, '')
		FROM chats c
		JOIN users peer ON peer.id = (CASE WHEN c.sender_id = ?1 THEN c.receiver_id ELSE c.sender_id END)
		WHERE (c.sender_id = ?1 OR c.receiver_id = ?1)
		  AND LOWER(c.content) LIKE ? ESCAPE '\'
		ORDER BY c.created_at DESC
		LIMIT ?`, userID, pattern, searchLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []SearchMessageHit{}
	for rows.Next() {
		var h SearchMessageHit
		if err := rows.Scan(&h.ID, &h.SenderID, &h.PeerID, &h.Content, &h.CreatedAt,
			&h.PeerFirstName, &h.PeerLastName, &h.PeerNickname, &h.PeerAvatar); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, nil
}
