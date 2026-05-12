package main

import (
	"fmt"
	"os"

	"social-network/pkg/app"
	"social-network/pkg/db/sqlite"
	"social-network/pkg/server"
	ws "social-network/pkg/websocket"
)

func main() {
	// Runtime data (DB + uploaded files) lives in ./data/ which is mounted as
	// a Docker named volume. Source code in pkg/db/sqlite/ stays read-only.
	if err := os.MkdirAll("./data/uploads", 0755); err != nil {
		fmt.Printf("Error creating data dir: %v\n", err)
		return
	}
	if err := sqlite.InitDB("./data/social_network.db", "pkg/db/migrations/sqlite"); err != nil {
		fmt.Printf("Error initializing database: %v\n", err)
		return
	}
	sqlite.CleanUpSessions()

	ws.InitBridge(ws.Storage{
		SavePrivateMessage:    sqlite.SavePrivateMessage,
		CanSendPrivateMessage: sqlite.CanSendPrivateMessage,
		SaveGroupMessage:      sqlite.SaveGroupMessage,
		CanSendGroupMessage:   sqlite.CanSendGroupMessage,
		ListGroupMembers:      sqlite.ListGroupMemberIDs,
	})

	if err := server.Start(":8080", app.NewRouter()); err != nil {
		fmt.Printf("Error starting server: %v\n", err)
	}
}
