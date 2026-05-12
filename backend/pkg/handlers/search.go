package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
)

// GET /api/search?q=foo&kind=all|users|posts|comments|messages
//
// One endpoint, returns categorized results. UI either renders all four
// buckets (kind=all) or filters by a single kind from the tabs. Empty query
// returns an empty response — avoids LIKE '%%' dumping the whole DB.
func SearchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("q"))
	kind := r.URL.Query().Get("kind")
	if kind == "" {
		kind = "all"
	}

	res := sqlite.SearchResults{}
	if query == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(res)
		return
	}

	want := func(target string) bool { return kind == "all" || kind == target }

	if want("users") {
		if u, err := sqlite.SearchUsers(query); err == nil {
			res.Users = u
		}
	}
	if want("posts") {
		if p, err := sqlite.SearchPosts(userID, query); err == nil {
			res.Posts = p
		}
	}
	if want("comments") {
		if c, err := sqlite.SearchComments(userID, query); err == nil {
			res.Comments = c
		}
	}
	if want("messages") {
		if m, err := sqlite.SearchMessages(userID, query); err == nil {
			res.Messages = m
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}
