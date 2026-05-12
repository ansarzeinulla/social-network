package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
)

// GET /api/chats — list of threads (peers user has talked with).
func ListThreadsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(middleware.UserIDKey).(int64)
	threads, err := sqlite.ListThreadsForUser(userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(threads)
}

// GET  /api/chats/messages?peer_id=N — full conversation history with one peer.
// POST /api/chats/messages { "peer_id": N, "body": "..." } — send a private message.
func ChatHistoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(middleware.UserIDKey).(int64)

	if r.Method == http.MethodPost {
		var body struct {
			PeerID int64  `json:"peer_id"`
			Body   string `json:"body"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		if body.PeerID == 0 {
			http.Error(w, "missing peer_id", http.StatusBadRequest)
			return
		}
		if body.Body == "" {
			http.Error(w, "body required", http.StatusBadRequest)
			return
		}
		if body.PeerID == userID {
			http.Error(w, "cannot message yourself", http.StatusBadRequest)
			return
		}
		allowed, err := sqlite.CanSendPrivateMessage(userID, body.PeerID)
		if err != nil {
			http.Error(w, "peer not found", http.StatusNotFound)
			return
		}
		if !allowed {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		id, err := sqlite.SavePrivateMessage(userID, body.PeerID, body.Body)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]int64{"id": id})
		return
	}

	peerStr := r.URL.Query().Get("peer_id")
	peerID, err := strconv.ParseInt(peerStr, 10, 64)
	if err != nil || peerID == 0 {
		http.Error(w, "missing or invalid peer_id", http.StatusBadRequest)
		return
	}
	msgs, err := sqlite.ListMessagesBetween(userID, peerID, 200)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	// Mark this thread as read on every history fetch — the caller is by
	// definition "looking at" the conversation right now. Best-effort; failure
	// shouldn't block the response.
	_ = sqlite.MarkChatRead(userID, peerID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgs)
}

// GET  /api/groups/chat/history?group_id=N — group chat history.
// POST /api/groups/chat/history { "group_id": N, "body": "..." } — send group chat message.
func GroupChatHistoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(middleware.UserIDKey).(int64)

	if r.Method == http.MethodPost {
		var body struct {
			GroupID int64  `json:"group_id"`
			Body    string `json:"body"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		if body.GroupID == 0 {
			http.Error(w, "missing group_id", http.StatusBadRequest)
			return
		}
		if body.Body == "" {
			http.Error(w, "body required", http.StatusBadRequest)
			return
		}
		allowed, err := sqlite.CanSendGroupMessage(body.GroupID, userID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		if !allowed {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		id, err := sqlite.SaveGroupMessage(body.GroupID, userID, body.Body)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]int64{"id": id})
		return
	}

	groupStr := r.URL.Query().Get("group_id")
	groupID, err := strconv.ParseInt(groupStr, 10, 64)
	if err != nil || groupID == 0 {
		http.Error(w, "missing or invalid group_id", http.StatusBadRequest)
		return
	}
	allowed, err := sqlite.CanSendGroupMessage(groupID, userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if !allowed {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	msgs, err := sqlite.ListGroupChatHistory(groupID, 200)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	_ = sqlite.MarkGroupChatRead(userID, groupID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgs)
}
