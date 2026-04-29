package sqlite

import (
	"social-network/pkg/models"
)

const groupSelectCols = `
	g.id, g.creator_id,
	creator.first_name, creator.last_name, COALESCE(creator.nickname, ''),
	g.title, g.description, g.created_at,
	(SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = 'member') AS members,
	COALESCE(gm.status, '') AS my_status
`

func scanGroup(scan func(...any) error) (models.Group, error) {
	var g models.Group
	var myStatus string
	err := scan(
		&g.ID, &g.CreatorID,
		&g.CreatorFirstName, &g.CreatorLastName, &g.CreatorNickname,
		&g.Title, &g.Description, &g.CreatedAt,
		&g.MembersCount, &myStatus,
	)
	if err != nil {
		return g, err
	}
	g.Joined = myStatus == "member"
	g.Pending = myStatus == "requested" || myStatus == "invited"
	return g, nil
}

func ListGroups(callerID int64) ([]models.Group, error) {
	rows, err := DB.Query(`
		SELECT `+groupSelectCols+`
		FROM groups g
		JOIN users creator ON creator.id = g.creator_id
		LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
		ORDER BY g.created_at DESC`, callerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.Group
	for rows.Next() {
		g, err := scanGroup(rows.Scan)
		if err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, nil
}

func GetGroup(id, callerID int64) (*models.Group, error) {
	g, err := scanGroup(DB.QueryRow(`
		SELECT `+groupSelectCols+`
		FROM groups g
		JOIN users creator ON creator.id = g.creator_id
		LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
		WHERE g.id = ?`, callerID, id).Scan)
	if err != nil {
		return nil, err
	}
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
		return status, nil
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

// ListGroupMembers returns confirmed members (status='member') with public user info,
// creator first.
func ListGroupMembers(groupID int64) ([]models.PublicUser, error) {
	rows, err := DB.Query(`
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.nickname, ''),
		       COALESCE(u.avatar, ''), COALESCE(u.about_me, ''), u.is_public
		FROM users u
		JOIN group_members gm ON gm.user_id = u.id
		JOIN groups g ON g.id = gm.group_id
		WHERE gm.group_id = ? AND gm.status = 'member'
		ORDER BY (u.id = g.creator_id) DESC, gm.created_at ASC`, groupID)
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
