package sqlite

import (
	"database/sql"
	"errors"
	"social-network/pkg/models"
	"strings"
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

func ListGroups(callerID int64, search string) ([]models.Group, error) {
	query := `
		SELECT ` + groupSelectCols + `
		FROM groups g
		JOIN users creator ON creator.id = g.creator_id
		LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
	`
	args := []any{callerID}
	if search != "" {
		query += ` WHERE LOWER(g.title) LIKE ? ESCAPE '\' OR LOWER(g.description) LIKE ? ESCAPE '\'`
		pattern := "%" + escapeLike(strings.ToLower(search)) + "%"
		args = append(args, pattern, pattern)
	}
	query += ` ORDER BY g.created_at DESC`
	rows, err := DB.Query(query, args...)
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

func escapeLike(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)
	return s
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

func IsGroupMember(groupID, userID int64) (bool, error) {
	var status string
	err := DB.QueryRow(`SELECT status FROM group_members WHERE group_id = ? AND user_id = ?`,
		groupID, userID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return status == "member", nil
}

func IsGroupCreator(groupID, userID int64) (bool, error) {
	var exists int
	err := DB.QueryRow(`SELECT 1 FROM groups WHERE id = ? AND creator_id = ?`, groupID, userID).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return exists == 1, nil
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
	var status string
	err := DB.QueryRow(`SELECT status FROM group_members WHERE group_id = ? AND user_id = ?`,
		groupID, userID).Scan(&status)
	if err == nil {
		return errors.New("user already has group membership")
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	_, err = DB.Exec(
		`INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, 'invited')`,
		groupID, userID,
	)
	return err
}

func AcceptGroupMembership(groupID, userID int64) error {
	res, err := DB.Exec(
		`UPDATE group_members SET status = 'member'
		 WHERE group_id = ? AND user_id = ? AND status = 'invited'`,
		groupID, userID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("no membership to accept")
	}
	return nil
}

func AcceptGroupRequest(groupID, requesterID int64) error {
	res, err := DB.Exec(
		`UPDATE group_members SET status = 'member'
		 WHERE group_id = ? AND user_id = ? AND status = 'requested'`,
		groupID, requesterID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("no pending request")
	}
	return nil
}

func DeclineGroupRequest(groupID, requesterID int64) error {
	res, err := DB.Exec(
		`DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'requested'`,
		groupID, requesterID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("no pending request")
	}
	return nil
}

func ListGroupRequests(groupID int64) ([]models.PublicUser, error) {
	return queryPublicUsers(`
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.nickname, ''),
		       COALESCE(u.avatar, ''), COALESCE(u.about_me, ''), u.is_public
		FROM users u
		JOIN group_members gm ON gm.user_id = u.id
		WHERE gm.group_id = ? AND gm.status = 'requested'
		ORDER BY gm.created_at ASC`, groupID)
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

func CreateGroupPost(groupID, userID int64, content, imageURL string) (int64, error) {
	res, err := DB.Exec(
		`INSERT INTO group_posts (group_id, user_id, content, image_url) VALUES (?, ?, ?, ?)`,
		groupID, userID, content, nullIfEmpty(imageURL),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func ListGroupPosts(groupID int64) ([]models.GroupPost, error) {
	rows, err := DB.Query(`
		SELECT gp.id, gp.group_id, gp.user_id, gp.content, gp.image_url, gp.created_at,
		       u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar, '')
		FROM group_posts gp
		JOIN users u ON u.id = gp.user_id
		WHERE gp.group_id = ?
		ORDER BY gp.created_at DESC`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.GroupPost
	for rows.Next() {
		var p models.GroupPost
		var img sql.NullString
		if err := rows.Scan(&p.ID, &p.GroupID, &p.UserID, &p.Content, &img, &p.CreatedAt,
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

func GetGroupPost(postID int64) (*models.GroupPost, error) {
	var p models.GroupPost
	var img sql.NullString
	err := DB.QueryRow(`
		SELECT gp.id, gp.group_id, gp.user_id, gp.content, gp.image_url, gp.created_at,
		       u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar, '')
		FROM group_posts gp
		JOIN users u ON u.id = gp.user_id
		WHERE gp.id = ?`, postID).Scan(
		&p.ID, &p.GroupID, &p.UserID, &p.Content, &img, &p.CreatedAt,
		&p.FirstName, &p.LastName, &p.Nickname, &p.Avatar,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if img.Valid {
		p.ImageURL = img.String
	}
	return &p, nil
}

func CreateGroupComment(groupPostID, userID int64, content, imageURL string) (int64, error) {
	res, err := DB.Exec(
		`INSERT INTO group_comments (group_post_id, user_id, content, image_url) VALUES (?, ?, ?, ?)`,
		groupPostID, userID, content, nullIfEmpty(imageURL),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func ListGroupComments(groupPostID int64) ([]models.GroupComment, error) {
	rows, err := DB.Query(`
		SELECT gc.id, gc.group_post_id, gc.user_id, gc.content, gc.image_url, gc.created_at,
		       u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar, '')
		FROM group_comments gc
		JOIN users u ON u.id = gc.user_id
		WHERE gc.group_post_id = ?
		ORDER BY gc.created_at ASC`, groupPostID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.GroupComment
	for rows.Next() {
		var c models.GroupComment
		var img sql.NullString
		if err := rows.Scan(&c.ID, &c.GroupPostID, &c.UserID, &c.Content, &img, &c.CreatedAt,
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
