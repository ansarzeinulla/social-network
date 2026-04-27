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

// GET /api/chats/messages?peer_id=N — full conversation history with one peer.
func ChatHistoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(middleware.UserIDKey).(int64)

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
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgs)
}

// GET /api/groups/chat/history?group_id=N — group chat history.
func GroupChatHistoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	groupStr := r.URL.Query().Get("group_id")
	groupID, err := strconv.ParseInt(groupStr, 10, 64)
	if err != nil || groupID == 0 {
		http.Error(w, "missing or invalid group_id", http.StatusBadRequest)
		return
	}
	msgs, err := sqlite.ListGroupChatHistory(groupID, 200)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgs)
}
