package middleware

import "net/http"

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, err := r.Cookie("session_token")
		if err != nil {
			http.Error(w, "Ты не авторизован", http.StatusUnauthorized)
			return
		}

		// ТУТ БУДЕТ SQL ЗАПРОС: проверяем, есть ли cookie.Value в таблице sessions
		// SELECT user_id FROM sessions WHERE token = cookie.Value

		// Если всё ок — пускаем дальше к хандлеру (например, к ProfileHandler)
		next.ServeHTTP(w, r)
	}
}
