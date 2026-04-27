// Package websocket implements a real-time message hub for the social network.
//
// Architecture:
//
//	HTTP /ws upgrade  -->  Client (one per connection)
//	                       |
//	                       +-- Read pump:  reads frames from socket, feeds to Hub.inbound
//	                       +-- Write pump: drains Client.send chan, writes to socket
//
//	Hub (singleton):
//	  - Tracks clients by user ID (one user can have several tabs/devices)
//	  - Routes outbound events: SendToUser(uid, event) finds all clients for that
//	    user and pushes to their send chans
//	  - Inbound frames are dispatched to handlers (chat, group_chat, ...) via the
//	    bridge in wsbridge.go (kept separate so DB layer is not imported here)
//
// The hub is started once from server.go (go HubInstance.Run()).
package websocket

import (
	"encoding/json"
	"log"
	"sync"
)

// Event is a JSON envelope for everything that travels through the websocket.
// Type discriminates the payload; concrete payloads live in the bridge.
type Event struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type Hub struct {
	mu      sync.RWMutex
	clients map[int64]map[*Client]struct{} // userID -> set of clients
	// Inbound frames are processed by the registered dispatch func.
	dispatch func(userID int64, ev Event)
}

var HubInstance = &Hub{
	clients:  make(map[int64]map[*Client]struct{}),
	dispatch: func(int64, Event) {}, // no-op until SetDispatch is called
}

// SetDispatch wires the inbound-frame router. Called from main.
func (h *Hub) SetDispatch(fn func(userID int64, ev Event)) {
	h.dispatch = fn
}

func (h *Hub) register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	set, ok := h.clients[c.userID]
	if !ok {
		set = make(map[*Client]struct{})
		h.clients[c.userID] = set
	}
	set[c] = struct{}{}
	log.Printf("[ws] register user=%d total_conns_for_user=%d", c.userID, len(set))
}

func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if set, ok := h.clients[c.userID]; ok {
		delete(set, c)
		if len(set) == 0 {
			delete(h.clients, c.userID)
		}
	}
	close(c.send)
	log.Printf("[ws] unregister user=%d", c.userID)
}

// SendToUser fans out an event to every connection that user has open.
// Returns true if at least one client received it (i.e. user is online).
func (h *Hub) SendToUser(userID int64, ev Event) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	set, ok := h.clients[userID]
	if !ok {
		return false
	}
	bytes, err := json.Marshal(ev)
	if err != nil {
		log.Printf("[ws] marshal error: %v", err)
		return false
	}
	delivered := false
	for c := range set {
		select {
		case c.send <- bytes:
			delivered = true
		default:
			// Slow consumer; drop & let read pump close it on next tick.
			log.Printf("[ws] send buffer full for user=%d, dropping", userID)
		}
	}
	return delivered
}

// SendToUsers — convenience for multi-recipient broadcasts (group chat).
func (h *Hub) SendToUsers(userIDs []int64, ev Event) {
	for _, uid := range userIDs {
		h.SendToUser(uid, ev)
	}
}

// IsOnline reports whether a user has any open connections.
func (h *Hub) IsOnline(userID int64) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	_, ok := h.clients[userID]
	return ok
}

// OnlineUsers returns IDs of currently connected users (for presence lists).
func (h *Hub) OnlineUsers() []int64 {
	h.mu.RLock()
	defer h.mu.RUnlock()
	ids := make([]int64, 0, len(h.clients))
	for id := range h.clients {
		ids = append(ids, id)
	}
	return ids
}
