package sqlite

import (
	"database/sql"
	"social-network/pkg/models"
)

// CreateNotification inserts a row and returns its ID.
// entityID is optional (for group-related notifications). Pass nil to leave NULL.
func CreateNotification(receiverID, senderID int64, kind string, entityID *int64) (int64, error) {
	var ent any
	if entityID != nil {
		ent = *entityID
	} else {
		ent = nil
	}
	res, err := DB.Exec(
		`INSERT INTO notifications (receiver_id, sender_id, type, entity_id) VALUES (?, ?, ?, ?)`,
		receiverID, senderID, kind, ent,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func ListNotifications(userID int64) ([]models.Notification, error) {
	rows, err := DB.Query(`
		SELECT n.id, n.receiver_id, n.sender_id, u.first_name, u.last_name,
		       COALESCE(u.nickname, ''), n.type, n.entity_id, n.is_read, n.created_at
		FROM notifications n
		JOIN users u ON u.id = n.sender_id
		WHERE n.receiver_id = ?
		ORDER BY n.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.Notification
	for rows.Next() {
		var n models.Notification
		var entity sql.NullInt64
		if err := rows.Scan(&n.ID, &n.ReceiverID, &n.SenderID, &n.SenderFirstName, &n.SenderLastName,
			&n.SenderNickname, &n.Type, &entity, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, err
		}
		if entity.Valid {
			id := entity.Int64
			n.EntityID = &id
		}
		out = append(out, n)
	}
	return out, nil
}

func MarkNotificationRead(id, userID int64) error {
	_, err := DB.Exec(
		`UPDATE notifications SET is_read = 1 WHERE id = ? AND receiver_id = ?`,
		id, userID,
	)
	return err
}

func MarkAllNotificationsRead(userID int64) error {
	_, err := DB.Exec(`UPDATE notifications SET is_read = 1 WHERE receiver_id = ?`, userID)
	return err
}

// DeleteFollowRequestNotification clears the pending follow_request row that
// matches a (sender, receiver) pair. Called after the receiver accepts or
// declines so the notification disappears from their inbox.
func DeleteFollowRequestNotification(receiverID, senderID int64) error {
	_, err := DB.Exec(
		`DELETE FROM notifications
		 WHERE receiver_id = ? AND sender_id = ? AND type = 'follow_request'`,
		receiverID, senderID,
	)
	return err
}
