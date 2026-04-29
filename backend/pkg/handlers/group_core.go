package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
)

// GET  /api/groups
// POST /api/groups   { "title", "description" }
func GroupsRootHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int64)
	switch r.Method {
	case http.MethodGet:
		out, err := sqlite.ListGroups(userID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, out)
	case http.MethodPost:
		var body struct {
			Title       string `json:"title"`
			Description string `json:"description"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		if body.Title == "" {
			http.Error(w, "title required", http.StatusBadRequest)
			return
		}
		id, err := sqlite.CreateGroup(userID, body.Title, body.Description)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]int64{"id": id})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// GET  /api/groups/{id}
// POST /api/groups/{id}/join
// POST /api/groups/{id}/invite   { "user_id": N }
// POST /api/groups/{id}/accept   (called by invited user)
func GroupItemHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int64)
	rest := strings.TrimPrefix(r.URL.Path, "/api/groups/")

	// path forms: "1", "1/join", "1/invite", "1/accept", "1/chat", "1/events"
	parts := strings.SplitN(rest, "/", 2)
	if len(parts) == 0 || parts[0] == "" {
		http.NotFound(w, r)
		return
	}
	gid, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	action := ""
	if len(parts) == 2 {
		action = parts[1]
	}

	switch {
	case action == "" && r.Method == http.MethodGet:
		g, err := sqlite.GetGroup(gid, userID)
		if err != nil || g == nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		writeJSON(w, g)

	case action == "members" && r.Method == http.MethodGet:
		members, err := sqlite.ListGroupMembers(gid)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, members)

	case action == "join" && r.Method == http.MethodPost:
		status, err := sqlite.JoinGroup(gid, userID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]string{"status": status})

	case action == "invite" && r.Method == http.MethodPost:
		var body struct {
			UserID int64 `json:"user_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.UserID == 0 {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		if err := sqlite.InviteToGroup(gid, body.UserID); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		eid := gid
		_, _ = sqlite.CreateNotification(body.UserID, userID, "group_invite", &eid)
		writeJSON(w, map[string]string{"status": "invited"})

	case action == "accept" && r.Method == http.MethodPost:
		if err := sqlite.AcceptGroupMembership(gid, userID); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]string{"status": "member"})

	default:
		http.NotFound(w, r)
	}
}
