package main

import (
	"fmt"
	"net/http"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/handlers"
	"social-network/pkg/middleware"
)

func main() {
	err := sqlite.InitDB("./pkg/db/sqlite/social_network.db", "pkg/db/migrations/sqlite")
	if err != nil {
		fmt.Printf("Error initializing database: %v\n", err)
		return
	}

	sqlite.CleanUpSessions()

	mux := http.NewServeMux()

	mux.HandleFunc("/api/register", handlers.RegisterHandler)
	mux.HandleFunc("/api/login", handlers.LoginHandler)
	mux.HandleFunc("/api/logout", handlers.LogoutHandler)

	mux.HandleFunc("/api/profile", middleware.AuthMiddleware(handlers.ProfileHandler))
	mux.HandleFunc("/api/posts", middleware.AuthMiddleware(handlers.GetPostsHandler))

	fmt.Println("Server running on :8080")
	http.ListenAndServe(":8080", middleware.CORSMiddleware(mux))
}
