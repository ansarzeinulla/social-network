package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"

	_ "github.com/mattn/go-sqlite3"
)

func TestMarkNotificationReadOwnership(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite memory db: %v", err)
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(`
		CREATE TABLE notifications (
			id INTEGER PRIMARY KEY,
			receiver_id INTEGER NOT NULL,
			sender_id INTEGER NOT NULL,
			type TEXT NOT NULL,
			entity_id INTEGER,
			is_read BOOLEAN DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		INSERT INTO notifications (id, receiver_id, sender_id, type, is_read)
		VALUES
			(1, 10, 20, 'follow_request', 0),
			(2, 30, 20, 'follow_request', 0);
	`); err != nil {
		t.Fatalf("seed notifications: %v", err)
	}

	oldDB := sqlite.DB
	sqlite.DB = db
	t.Cleanup(func() {
		sqlite.DB = oldDB
		db.Close()
	})

	status := markNotificationReadStatus(t, 1, 10)
	if status != http.StatusOK {
		t.Fatalf("own notification status = %d, want %d", status, http.StatusOK)
	}
	if !notificationRead(t, 1) {
		t.Fatalf("own notification was not marked read")
	}

	status = markNotificationReadStatus(t, 2, 10)
	if status != http.StatusNotFound {
		t.Fatalf("other user's notification status = %d, want %d", status, http.StatusNotFound)
	}
	if notificationRead(t, 2) {
		t.Fatalf("other user's notification should remain unread")
	}

	status = markNotificationReadStatus(t, 999, 10)
	if status != http.StatusOK {
		t.Fatalf("missing notification status = %d, want %d", status, http.StatusOK)
	}
}

func markNotificationReadStatus(t *testing.T, notificationID, userID int64) int {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/notifications/1/read", nil)
	req.URL.Path = "/api/notifications/" + sqlID(notificationID) + "/read"
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rec := httptest.NewRecorder()

	MarkNotificationReadHandler(rec, req)
	return rec.Code
}

func notificationRead(t *testing.T, notificationID int64) bool {
	t.Helper()
	var isRead bool
	if err := sqlite.DB.QueryRow(`SELECT is_read FROM notifications WHERE id = ?`, notificationID).Scan(&isRead); err != nil {
		t.Fatalf("read notification %d: %v", notificationID, err)
	}
	return isRead
}

func sqlID(id int64) string {
	return strconv.FormatInt(id, 10)
}
