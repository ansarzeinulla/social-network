package sqlite

import (
	"database/sql"
	"errors"
	"social-network/pkg/models"
)

// FollowState describes a follow request between two users.
type FollowState struct {
	Status   string // "" (none) | "pending" | "accepted"
	IsFollowing bool
}

// GetFollowState returns the directed state from follower → followee.
func GetFollowState(followerID, followeeID int64) (FollowState, error) {
	var status string
	err := DB.QueryRow(
		`SELECT status FROM followers WHERE follower_id = ? AND followee_id = ?`,
		followerID, followeeID,
	).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return FollowState{}, nil
	}
	if err != nil {
		return FollowState{}, err
	}
	return FollowState{Status: status, IsFollowing: status == "accepted"}, nil
}

// IsPublicProfile is a small helper used by Follow() to decide between
// "auto-accept" and "create pending request".
func IsPublicProfile(userID int64) (bool, error) {
	var pub bool
	err := DB.QueryRow(`SELECT is_public FROM users WHERE id = ?`, userID).Scan(&pub)
	if err != nil {
		return false, err
	}
	return pub, nil
}

// Follow creates (or no-ops if already exists) a follow link.
// Returns the resulting status:
//   - "accepted" if target is public (auto-follow)
//   - "pending"  if target is private (waits for accept)
//   - already-existing status if a row was already there
func Follow(followerID, followeeID int64) (string, error) {
	if followerID == followeeID {
		return "", errors.New("cannot follow yourself")
	}
	cur, err := GetFollowState(followerID, followeeID)
	if err != nil {
		return "", err
	}
	if cur.Status != "" {
		return cur.Status, nil
	}

	pub, err := IsPublicProfile(followeeID)
	if err != nil {
		return "", err
	}
	status := "pending"
	if pub {
		status = "accepted"
	}
	_, err = DB.Exec(
		`INSERT INTO followers (follower_id, followee_id, status) VALUES (?, ?, ?)`,
		followerID, followeeID, status,
	)
	if err != nil {
		return "", err
	}
	return status, nil
}

// Unfollow removes any follow link (pending or accepted) in either direction
// of (follower → followee). Returns true if a row was removed.
func Unfollow(followerID, followeeID int64) (bool, error) {
	res, err := DB.Exec(
		`DELETE FROM followers WHERE follower_id = ? AND followee_id = ?`,
		followerID, followeeID,
	)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// AcceptFollow flips status from 'pending' to 'accepted'. The acceptor is
// the followee (the request target). Returns false if no pending row exists.
func AcceptFollow(followerID, followeeID int64) (bool, error) {
	res, err := DB.Exec(
		`UPDATE followers SET status = 'accepted'
		 WHERE follower_id = ? AND followee_id = ? AND status = 'pending'`,
		followerID, followeeID,
	)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// DeclineFollow deletes a pending request.
func DeclineFollow(followerID, followeeID int64) (bool, error) {
	res, err := DB.Exec(
		`DELETE FROM followers
		 WHERE follower_id = ? AND followee_id = ? AND status = 'pending'`,
		followerID, followeeID,
	)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// ListFollowers returns users who follow `userID` (status='accepted').
func ListFollowers(userID int64) ([]models.PublicUser, error) {
	return queryPublicUsers(`
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.nickname, ''),
		       COALESCE(u.avatar, ''), COALESCE(u.about_me, ''), u.is_public
		FROM users u
		JOIN followers f ON u.id = f.follower_id
		WHERE f.followee_id = ? AND f.status = 'accepted'`, userID)
}

// ListFollowing returns users that `userID` follows (status='accepted').
func ListFollowing(userID int64) ([]models.PublicUser, error) {
	return queryPublicUsers(`
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.nickname, ''),
		       COALESCE(u.avatar, ''), COALESCE(u.about_me, ''), u.is_public
		FROM users u
		JOIN followers f ON u.id = f.followee_id
		WHERE f.follower_id = ? AND f.status = 'accepted'`, userID)
}

// ListPendingRequestsTo returns users with pending requests waiting for
// `userID` (the followee) to accept/decline.
func ListPendingRequestsTo(userID int64) ([]models.PublicUser, error) {
	return queryPublicUsers(`
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.nickname, ''),
		       COALESCE(u.avatar, ''), COALESCE(u.about_me, ''), u.is_public
		FROM users u
		JOIN followers f ON u.id = f.follower_id
		WHERE f.followee_id = ? AND f.status = 'pending'`, userID)
}

func queryPublicUsers(query string, args ...any) ([]models.PublicUser, error) {
	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.PublicUser
	for rows.Next() {
		var u models.PublicUser
		if err := rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Nickname, &u.Avatar, &u.AboutMe, &u.IsPublic); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, nil
}
