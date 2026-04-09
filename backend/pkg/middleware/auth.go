package middleware

import (
	"context"
	"net/http"
	"social-network/pkg/db/sqlite"
)

type contextKey string
const UserIDKey contextKey = "userID"

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_token")
		if err != nil {
			http.Error(w, "Unauthorized: No session", http.StatusUnauthorized)
			return
		}

		userID, err := sqlite.GetUserIDByToken(cookie.Value)
		if err != nil || userID == 0 {
			http.Error(w, "Unauthorized: Invalid session", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}
