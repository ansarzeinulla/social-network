package sqlite

import (
	"social-network/pkg/models"
)

// ListGroups returns every group with the caller's per-group membership
// status mixed in (so the UI can decide between "Join" and "Open").
//   joined = true when status = 'member'
//   pending = true when status = 'requested' or 'invited'
func ListGroups(callerID int64) ([]models.Group, error) {
	rows, err := DB.Query(`
		SELECT g.id, g.creator_id, g.title, g.description, g.created_at,
		       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = 'member') AS members,
		       COALESCE(gm.status, '') AS my_status
		FROM groups g
		LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
		ORDER BY g.created_at DESC`, callerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.Group
	for rows.Next() {
		var g models.Group
		var myStatus string
		if err := rows.Scan(&g.ID, &g.CreatorID, &g.Title, &g.Description, &g.CreatedAt, &g.MembersCount, &myStatus); err != nil {
			return nil, err
		}
		g.Joined = myStatus == "member"
		g.Pending = myStatus == "requested" || myStatus == "invited"
		out = append(out, g)
	}
	return out, nil
}

func GetGroup(id, callerID int64) (*models.Group, error) {
	var g models.Group
	var myStatus string
	err := DB.QueryRow(`
		SELECT g.id, g.creator_id, g.title, g.description, g.created_at,
		       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = 'member'),
		       COALESCE(gm.status, '')
		FROM groups g
		LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
		WHERE g.id = ?`, callerID, id).
		Scan(&g.ID, &g.CreatorID, &g.Title, &g.Description, &g.CreatedAt, &g.MembersCount, &myStatus)
	if err != nil {
		return nil, err
	}
	g.Joined = myStatus == "member"
	g.Pending = myStatus == "requested" || myStatus == "invited"
	return &g, nil
}

func CreateGroup(creatorID int64, title, description string) (int64, error) {
	tx, err := DB.Begin()
	if err != nil {
		return 0, err
	}
	res, err := tx.Exec(`INSERT INTO groups (creator_id, title, description) VALUES (?, ?, ?)`,
		creatorID, title, description)
	if err != nil {
		tx.Rollback()
		return 0, err
	}
	id, _ := res.LastInsertId()
	if _, err := tx.Exec(`INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, 'member')`,
		id, creatorID); err != nil {
		tx.Rollback()
		return 0, err
	}
	return id, tx.Commit()
}

// JoinGroup creates a 'requested' membership unless one already exists.
func JoinGroup(groupID, userID int64) (string, error) {
	var status string
	err := DB.QueryRow(`SELECT status FROM group_members WHERE group_id = ? AND user_id = ?`,
		groupID, userID).Scan(&status)
	if err == nil {
		return status, nil // already in some state
	}
	_, err = DB.Exec(
		`INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, 'requested')`,
		groupID, userID,
	)
	if err != nil {
		return "", err
	}
	return "requested", nil
}

func InviteToGroup(groupID, userID int64) error {
	_, err := DB.Exec(
		`INSERT OR IGNORE INTO group_members (group_id, user_id, status) VALUES (?, ?, 'invited')`,
		groupID, userID,
	)
	return err
}

func AcceptGroupMembership(groupID, userID int64) error {
	_, err := DB.Exec(
		`UPDATE group_members SET status = 'member' WHERE group_id = ? AND user_id = ?`,
		groupID, userID,
	)
	return err
}
