package sqlite

import (
	"errors"
	"social-network/pkg/models"
)

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

func CanSendPrivateMessage(senderID, receiverID int64) (bool, error) {
	target, err := GetUserByID(receiverID)
	if err != nil {
		return false, err
	}
	if target == nil {
		return false, errors.New("user not found")
	}
	outgoing, err := GetFollowState(senderID, receiverID)
	if err != nil {
		return false, err
	}
	incoming, err := GetFollowState(receiverID, senderID)
	if err != nil {
		return false, err
	}
	return outgoing.Status == "accepted" || incoming.Status == "accepted", nil
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

func CanSendGroupMessage(groupID, senderID int64) (bool, error) {
	return IsGroupMember(groupID, senderID)
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
// most-recent first. Each row includes how many messages from that peer
// arrived after the user's last read of that thread (chat_reads table).
//
// Note the COALESCE(..., '1970-01-01'): if chat_reads has NO row yet for the
// (user, peer) pair (e.g. someone messaged the user for the first time), the
// inner SELECT returns NULL and `created_at > NULL` evaluates to NULL, which
// would make the COUNT return 0 — silently hiding genuinely-unread messages.
// Falling back to epoch ensures every message from the peer counts until the
// user actually opens the thread (which writes the chat_reads row).
func ListThreadsForUser(userID int64) ([]models.ChatThread, error) {
	rows, err := DB.Query(`
		SELECT
			peer.id, peer.first_name, peer.last_name, COALESCE(peer.nickname, ''), COALESCE(peer.avatar, ''),
			c.content, c.created_at,
			COALESCE((
				SELECT COUNT(*) FROM chats m
				WHERE m.sender_id = peer.id AND m.receiver_id = ?1
				  AND m.created_at > COALESCE(
				      (SELECT last_read_at FROM chat_reads cr
				       WHERE cr.user_id = ?1 AND cr.peer_id = peer.id),
				      '1970-01-01 00:00:00'
				  )
			), 0) AS unread_count
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
		if err := rows.Scan(&t.PeerID, &t.FirstName, &t.LastName, &t.Nickname, &t.Avatar,
			&t.LastMessage, &t.LastAt, &t.UnreadCount); err != nil {
			return nil, err
		}
		threads = append(threads, t)
	}
	return threads, nil
}

// MarkChatRead upserts chat_reads.last_read_at = CURRENT_TIMESTAMP for the
// (user, peer) pair. Called when the user fetches the conversation history,
// which is our proxy for "the user just looked at this thread".
func MarkChatRead(userID, peerID int64) error {
	_, err := DB.Exec(
		`INSERT INTO chat_reads (user_id, peer_id, last_read_at) VALUES (?, ?, CURRENT_TIMESTAMP)
		 ON CONFLICT(user_id, peer_id) DO UPDATE SET last_read_at = CURRENT_TIMESTAMP`,
		userID, peerID,
	)
	return err
}

// MarkGroupChatRead — same idea for group chats.
func MarkGroupChatRead(userID, groupID int64) error {
	_, err := DB.Exec(
		`INSERT INTO group_chat_reads (user_id, group_id, last_read_at) VALUES (?, ?, CURRENT_TIMESTAMP)
		 ON CONFLICT(user_id, group_id) DO UPDATE SET last_read_at = CURRENT_TIMESTAMP`,
		userID, groupID,
	)
	return err
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
