package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
	ws "social-network/pkg/websocket"
)

// FollowersHandler — legacy: GET /api/followers returns the caller's accepted followers.
// Kept for backwards compatibility (newpost.js uses it for the "viewers" picker).
func FollowersHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int64)
	followers, err := sqlite.ListFollowers(userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(followers)
}

// GET /api/users/{id}/followers
func UserFollowersHandler(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r.URL.Path, "/api/users/", "/followers")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	out, err := sqlite.ListFollowers(id)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, out)
}

// GET /api/users/{id}/online — is the user currently connected via websocket?
func UserOnlineHandler(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r.URL.Path, "/api/users/", "/online")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, map[string]bool{"online": ws.HubInstance.IsOnline(id)})
}

// GET /api/users/{id}/following
func UserFollowingHandler(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r.URL.Path, "/api/users/", "/following")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	out, err := sqlite.ListFollowing(id)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, out)
}

// POST   /api/follow/{targetID}    -> follow (auto-accept if public, else pending)
// DELETE /api/follow/{targetID}    -> unfollow
func FollowHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int64)
	targetID, err := pathID(r.URL.Path, "/api/follow/", "")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if targetID == userID {
		http.Error(w, "cannot follow yourself", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodPost:
		status, err := sqlite.Follow(userID, targetID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		// If pending, fire a follow_request notification over WS.
		if status == "pending" {
			if _, err := sqlite.CreateNotification(targetID, userID, "follow_request", nil); err == nil {
				ws.PushNotification(targetID, map[string]any{
					"type":   "follow_request",
					"from":   userID,
				})
			}
		}
		writeJSON(w, map[string]string{"status": status})

	case http.MethodDelete:
		_, err := sqlite.Unfollow(userID, targetID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]string{"status": "unfollowed"})

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// POST /api/follow-requests/{requesterID}/accept
func AcceptFollowHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(middleware.UserIDKey).(int64)
	requesterID, err := pathID(r.URL.Path, "/api/follow-requests/", "/accept")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	ok, err := sqlite.AcceptFollow(requesterID, userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if !ok {
		http.Error(w, "no pending request", http.StatusNotFound)
		return
	}
	_ = sqlite.DeleteFollowRequestNotification(userID, requesterID)
	writeJSON(w, map[string]string{"status": "accepted"})
}

// POST /api/follow-requests/{requesterID}/decline
func DeclineFollowHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(middleware.UserIDKey).(int64)
	requesterID, err := pathID(r.URL.Path, "/api/follow-requests/", "/decline")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	ok, err := sqlite.DeclineFollow(requesterID, userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if !ok {
		http.Error(w, "no pending request", http.StatusNotFound)
		return
	}
	_ = sqlite.DeleteFollowRequestNotification(userID, requesterID)
	writeJSON(w, map[string]string{"status": "declined"})
}

// GET /api/follow-requests — incoming pending requests for caller.
func PendingFollowRequestsHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int64)
	out, err := sqlite.ListPendingRequestsTo(userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, out)
}

// --- helpers ---

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// pathID extracts an int64 from a URL path. Format: <prefix><id><suffix>.
// Suffix may be empty (then we take everything after prefix).
func pathID(path, prefix, suffix string) (int64, error) {
	if !strings.HasPrefix(path, prefix) {
		return 0, errInvalidPath
	}
	rest := strings.TrimPrefix(path, prefix)
	if suffix != "" {
		if !strings.HasSuffix(rest, suffix) {
			return 0, errInvalidPath
		}
		rest = strings.TrimSuffix(rest, suffix)
	}
	rest = strings.TrimSuffix(rest, "/")
	id, err := strconv.ParseInt(rest, 10, 64)
	if err != nil {
		return 0, errInvalidPath
	}
	return id, nil
}

var errInvalidPath = httpError{msg: "invalid path"}

type httpError struct{ msg string }

func (e httpError) Error() string { return e.msg }
