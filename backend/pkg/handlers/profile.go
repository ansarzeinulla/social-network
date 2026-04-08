package handlers

import (
	"encoding/json"
	"net/http"
)

func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"message": "Welcome to your profile"})
}
