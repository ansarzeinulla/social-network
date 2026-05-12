package server

import (
	"fmt"
	"net/http"
)

// Start owns the transport-level HTTP server lifecycle.
func Start(addr string, handler http.Handler) error {
	fmt.Printf("Server running on %s\n", addr)
	return http.ListenAndServe(addr, handler)
}
