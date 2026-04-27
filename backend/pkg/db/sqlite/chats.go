package sqlite

import "social-network/pkg/models"

func SavePrivateMessage(senderID, receiverID int64, body string) (int64, error) {
	res, err := DB.Exec(
		`INSERT INTO chats (sender_id, receiver_id, content) VALUES (?, ?, ?)`,
		senderID, receiverID, body,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func SaveGroupMessage(groupID, senderID int64, body string) (int64, error) {
	res, err := DB.Exec(
		`INSERT INTO group_chats (group_id, sender_id, content) VALUES (?, ?, ?)`,
		groupID, senderID, body,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// ListGroupMemberIDs returns IDs of users with status='member' in a group,
// used by the websocket bridge to fan out group messages.
func ListGroupMemberIDs(groupID int64) ([]int64, error) {
	rows, err := DB.Query(
		`SELECT user_id FROM group_members WHERE group_id = ? AND status = 'member'`,
		groupID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

// ListThreadsForUser returns one row per peer the user has chatted with,
// most-recent first.
func ListThreadsForUser(userID int64) ([]models.ChatThread, error) {
	rows, err := DB.Query(`
		SELECT
			peer.id, peer.first_name, peer.last_name, COALESCE(peer.nickname, ''), COALESCE(peer.avatar, ''),
			c.content, c.created_at
		FROM (
			SELECT
				CASE WHEN sender_id = ?1 THEN receiver_id ELSE sender_id END AS peer_id,
				MAX(id) AS last_id
			FROM chats
			WHERE sender_id = ?1 OR receiver_id = ?1
			GROUP BY peer_id
		) t
		JOIN chats c ON c.id = t.last_id
		JOIN users peer ON peer.id = t.peer_id
		ORDER BY c.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var threads []models.ChatThread
	for rows.Next() {
		var t models.ChatThread
		if err := rows.Scan(&t.PeerID, &t.FirstName, &t.LastName, &t.Nickname, &t.Avatar, &t.LastMessage, &t.LastAt); err != nil {
			return nil, err
		}
		threads = append(threads, t)
	}
	return threads, nil
}

// ListMessagesBetween returns the full conversation between two users in chrono order.
func ListMessagesBetween(userA, userB int64, limit int) ([]models.ChatMessage, error) {
	if limit <= 0 {
		limit = 200
	}
	rows, err := DB.Query(`
		SELECT id, sender_id, receiver_id, content, created_at
		FROM chats
		WHERE (sender_id = ?1 AND receiver_id = ?2) OR (sender_id = ?2 AND receiver_id = ?1)
		ORDER BY created_at ASC
		LIMIT ?3`, userA, userB, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.ChatMessage
	for rows.Next() {
		var m models.ChatMessage
		if err := rows.Scan(&m.ID, &m.SenderID, &m.ReceiverID, &m.Body, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, nil
}

// ListGroupChatHistory returns messages in a group's chat in chrono order.
func ListGroupChatHistory(groupID int64, limit int) ([]models.GroupChatMessage, error) {
	if limit <= 0 {
		limit = 200
	}
	rows, err := DB.Query(`
		SELECT gc.id, gc.group_id, gc.sender_id, u.first_name, u.last_name, gc.content, gc.created_at
		FROM group_chats gc
		JOIN users u ON u.id = gc.sender_id
		WHERE gc.group_id = ?
		ORDER BY gc.created_at ASC
		LIMIT ?`, groupID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.GroupChatMessage
	for rows.Next() {
		var m models.GroupChatMessage
		if err := rows.Scan(&m.ID, &m.GroupID, &m.SenderID, &m.SenderFirstName, &m.SenderLastName, &m.Body, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, nil
}
