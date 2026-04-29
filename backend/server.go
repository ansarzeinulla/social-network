package main

import (
	"fmt"
	"net/http"
	"os"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/handlers"
	"social-network/pkg/middleware"
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
		SavePrivateMessage: sqlite.SavePrivateMessage,
		SaveGroupMessage:   sqlite.SaveGroupMessage,
		ListGroupMembers:   sqlite.ListGroupMemberIDs,
	})

	mux := http.NewServeMux()

	// Auth
	mux.HandleFunc("/api/register", handlers.RegisterHandler)
	mux.HandleFunc("/api/login", handlers.LoginHandler)
	mux.HandleFunc("/api/logout", handlers.LogoutHandler)

	// Profile (own + by id + privacy toggle).
	// Path-based dispatch: /api/profile, /api/profile/{id}, /api/profile/privacy.
	mux.HandleFunc("/api/profile", middleware.AuthMiddleware(handlers.ProfileHandler))
	mux.HandleFunc("/api/profile/", middleware.AuthMiddleware(handlers.ProfileHandler))

	// Followers
	mux.HandleFunc("/api/followers", middleware.AuthMiddleware(handlers.FollowersHandler))                       // legacy
	mux.HandleFunc("/api/users/", middleware.AuthMiddleware(usersDispatch))                                       // /api/users/{id}/followers|following
	mux.HandleFunc("/api/follow/", middleware.AuthMiddleware(handlers.FollowHandler))                             // POST/DELETE /api/follow/{id}
	mux.HandleFunc("/api/follow-requests", middleware.AuthMiddleware(handlers.PendingFollowRequestsHandler))      // GET
	mux.HandleFunc("/api/follow-requests/", middleware.AuthMiddleware(followRequestsDispatch))                    // /accept|/decline

	// Posts
	mux.HandleFunc("/api/posts", middleware.AuthMiddleware(handlers.GetPostsHandler))
	mux.HandleFunc("/api/post", middleware.AuthMiddleware(handlers.GetPostHandler))
	mux.HandleFunc("/api/posts/create", middleware.AuthMiddleware(handlers.CreatePostHandler))
	mux.HandleFunc("/api/posts/update", middleware.AuthMiddleware(handlers.UpdatePostHandler))
	mux.HandleFunc("/api/posts/delete", middleware.AuthMiddleware(handlers.DeletePostHandler))

	// Chats (history; sending is over websocket)
	mux.HandleFunc("/api/chats", middleware.AuthMiddleware(handlers.ListThreadsHandler))
	mux.HandleFunc("/api/chats/messages", middleware.AuthMiddleware(handlers.ChatHistoryHandler))
	mux.HandleFunc("/api/groups/chat/history", middleware.AuthMiddleware(handlers.GroupChatHistoryHandler))

	// Notifications
	mux.HandleFunc("/api/notifications", middleware.AuthMiddleware(handlers.ListNotificationsHandler))
	mux.HandleFunc("/api/notifications/read-all", middleware.AuthMiddleware(handlers.MarkAllNotificationsReadHandler))
	mux.HandleFunc("/api/notifications/", middleware.AuthMiddleware(handlers.MarkNotificationReadHandler))

	// Groups
	mux.HandleFunc("/api/groups", middleware.AuthMiddleware(handlers.GroupsRootHandler))
	mux.HandleFunc("/api/groups/", middleware.AuthMiddleware(groupsDispatch))

	// Comments — under /api/posts/{id}/comments
	mux.HandleFunc("/api/posts/", middleware.AuthMiddleware(postsSubpaths))

	// WebSocket
	mux.HandleFunc("/ws", ws.ServeWS)

	// Static files served from ./data/uploads
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./data/uploads"))))

	fmt.Println("Server running on :8080")
	http.ListenAndServe(":8080", middleware.CORSMiddleware(mux))
}

// usersDispatch routes /api/users/{id}/{followers|following|online}.
// http.ServeMux can't pattern-match path segments, so we do it manually here
// rather than pulling in a third-party router (Allowed Packages spec).
func usersDispatch(w http.ResponseWriter, r *http.Request) {
	switch {
	case endsWith(r.URL.Path, "/followers"):
		handlers.UserFollowersHandler(w, r)
	case endsWith(r.URL.Path, "/following"):
		handlers.UserFollowingHandler(w, r)
	case endsWith(r.URL.Path, "/online"):
		handlers.UserOnlineHandler(w, r)
	case endsWith(r.URL.Path, "/posts"):
		handlers.UserPostsHandler(w, r)
	default:
		http.NotFound(w, r)
	}
}

func followRequestsDispatch(w http.ResponseWriter, r *http.Request) {
	switch {
	case endsWith(r.URL.Path, "/accept"):
		handlers.AcceptFollowHandler(w, r)
	case endsWith(r.URL.Path, "/decline"):
		handlers.DeclineFollowHandler(w, r)
	default:
		http.NotFound(w, r)
	}
}

func endsWith(s, suffix string) bool {
	return len(s) >= len(suffix) && s[len(s)-len(suffix):] == suffix
}

// groupsDispatch handles every path under /api/groups/<id>...
// We delegate to one handler so it can branch on the action segment.
func groupsDispatch(w http.ResponseWriter, r *http.Request) {
	handlers.GroupItemHandler(w, r)
}

// postsSubpaths routes the variants under /api/posts/...:
//   - /api/posts/{id}/comments  -> PostCommentsHandler (GET, POST)
//   - everything else here is unrecognized (the singular /api/post and
//     bulk /api/posts are registered above)
func postsSubpaths(w http.ResponseWriter, r *http.Request) {
	if endsWith(r.URL.Path, "/comments") {
		handlers.PostCommentsHandler(w, r)
		return
	}
	http.NotFound(w, r)
}
