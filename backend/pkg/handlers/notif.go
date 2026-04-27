package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
)

// GET /api/notifications
func ListNotificationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(middleware.UserIDKey).(int64)
	out, err := sqlite.ListNotifications(userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, out)
}

// POST /api/notifications/{id}/read
func MarkNotificationReadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(middleware.UserIDKey).(int64)

	rest := strings.TrimPrefix(r.URL.Path, "/api/notifications/")
	rest = strings.TrimSuffix(rest, "/read")
	id, err := strconv.ParseInt(rest, 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	if err := sqlite.MarkNotificationRead(id, userID); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

// POST /api/notifications/read-all
func MarkAllNotificationsReadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(middleware.UserIDKey).(int64)
	if err := sqlite.MarkAllNotificationsRead(userID); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}
