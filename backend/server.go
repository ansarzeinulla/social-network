package main

import (
	"fmt"
	"net/http"

	"social-network/pkg/handlers"
	"social-network/pkg/middleware"
)

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/register", handlers.RegisterHandler)
	mux.HandleFunc("/api/login", handlers.LoginHandler)

	mux.HandleFunc("/api/profile", middleware.AuthMiddleware(handlers.ProfileHandler))

	fmt.Println("Server running on :8080")
	http.ListenAndServe(":8080", mux)
}
