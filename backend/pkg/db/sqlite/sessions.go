package sqlite

import (
	"database/sql"
	"errors"
	"time"
)

type Session struct {
	Token     string
	UserID    int64
	ExpiresAt time.Time
}

func CreateSession(token string, userID int64, duration time.Duration) error {
	expiresAt := time.Now().Add(duration)
	query := `INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`
	_, err := DB.Exec(query, token, userID, expiresAt)
	return err
}

func GetUserIDByToken(token string) (int64, error) {
	var userID int64
	var expiresAt time.Time
	query := `SELECT user_id, expires_at FROM sessions WHERE token = ?`
	row := DB.QueryRow(query, token)
	err := row.Scan(&userID, &expiresAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}

	if time.Now().After(expiresAt) {
		DeleteSession(token)
		return 0, nil
	}

	return userID, nil
}

func DeleteSession(token string) error {
	query := `DELETE FROM sessions WHERE token = ?`
	_, err := DB.Exec(query, token)
	return err
}

func CleanUpSessions() {
	ticker := time.NewTicker(1 * time.Hour)
	go func() {
		for range ticker.C {
			DB.Exec(`DELETE FROM sessions WHERE expires_at < ?`, time.Now())
		}
	}()
}
