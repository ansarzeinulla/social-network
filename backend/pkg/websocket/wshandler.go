package websocket

import (
	"log"
	"net/http"

	"social-network/pkg/db/sqlite"

	"github.com/gorilla/websocket"
)

// upgrader is shared. CheckOrigin is permissive in dev; in production it
// must validate against the configured allowed origin list (use Caddy).
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// TODO: lock down once Caddy is in front of the app (Step 10).
		return true
	},
}

// ServeWS upgrades the HTTP connection to a WebSocket and binds it to the
// authenticated user. Auth is via the same session cookie used for /api/*,
// so the browser handshake "just works" with credentials: include.
//
// Why we don't use AuthMiddleware here:
//   AuthMiddleware writes 401 as plain text; the websocket upgrader has
//   already inspected r and we want to short-circuit before Hijack().
func ServeWS(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID, err := sqlite.GetUserIDByToken(cookie.Value)
	if err != nil || userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[ws] upgrade error: %v", err)
		return
	}

	c := NewClient(HubInstance, conn, userID)
	go c.Run()
}
