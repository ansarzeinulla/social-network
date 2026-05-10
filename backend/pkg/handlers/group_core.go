package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
)

// GET  /api/groups
// POST /api/groups   { "title", "description" }
func GroupsRootHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int64)
	switch r.Method {
	case http.MethodGet:
		search := r.URL.Query().Get("search")
		if search == "" {
			search = r.URL.Query().Get("q")
		}
		out, err := sqlite.ListGroups(userID, search)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, out)
	case http.MethodPost:
		var body struct {
			Title       string `json:"title"`
			Description string `json:"description"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		if body.Title == "" {
			http.Error(w, "title required", http.StatusBadRequest)
			return
		}
		id, err := sqlite.CreateGroup(userID, body.Title, body.Description)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]int64{"id": id})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// GET  /api/groups/{id}
// POST /api/groups/{id}/join
// POST /api/groups/{id}/invite   { "user_id": N }
// POST /api/groups/{id}/accept   (called by invited user)
func GroupItemHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int64)
	rest := strings.TrimPrefix(r.URL.Path, "/api/groups/")

	// path forms: "1", "1/join", "1/invite", "1/accept", "1/requests", "1/posts"
	parts := strings.SplitN(rest, "/", 2)
	if len(parts) == 0 || parts[0] == "" {
		http.NotFound(w, r)
		return
	}
	gid, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	action := ""
	if len(parts) == 2 {
		action = parts[1]
	}

	switch {
	case action == "" && r.Method == http.MethodGet:
		g, err := sqlite.GetGroup(gid, userID)
		if err != nil || g == nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		writeJSON(w, g)

	case action == "members" && r.Method == http.MethodGet:
		members, err := sqlite.ListGroupMembers(gid)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, members)

	case action == "join" && r.Method == http.MethodPost:
		status, err := sqlite.JoinGroup(gid, userID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]string{"status": status})

	case action == "invite" && r.Method == http.MethodPost:
		member, err := sqlite.IsGroupMember(gid, userID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		if !member {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		var body struct {
			UserID int64 `json:"user_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.UserID == 0 {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		if err := sqlite.InviteToGroup(gid, body.UserID); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		eid := gid
		_, _ = sqlite.CreateNotification(body.UserID, userID, "group_invite", &eid)
		writeJSON(w, map[string]string{"status": "invited"})

	case action == "accept" && r.Method == http.MethodPost:
		if err := sqlite.AcceptGroupMembership(gid, userID); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, map[string]string{"status": "member"})

	case action == "requests" && r.Method == http.MethodGet:
		creator, err := sqlite.IsGroupCreator(gid, userID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		if !creator {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		requests, err := sqlite.ListGroupRequests(gid)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, requests)

	case strings.HasPrefix(action, "requests/") && r.Method == http.MethodPost:
		handleGroupRequestAction(w, action, gid, userID)

	case action == "posts" && (r.Method == http.MethodGet || r.Method == http.MethodPost):
		handleGroupPosts(w, r, gid, userID)

	case strings.HasPrefix(action, "posts/"):
		handleGroupPostSubpath(w, r, action, gid, userID)

	default:
		http.NotFound(w, r)
	}
}

func handleGroupRequestAction(w http.ResponseWriter, action string, groupID, userID int64) {
	creator, err := sqlite.IsGroupCreator(groupID, userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if !creator {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	parts := strings.Split(action, "/")
	if len(parts) != 3 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	requesterID, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}
	if requesterID == userID {
		http.Error(w, "cannot accept yourself", http.StatusBadRequest)
		return
	}

	switch parts[2] {
	case "accept":
		if err := sqlite.AcceptGroupRequest(groupID, requesterID); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, map[string]string{"status": "member"})
	case "decline":
		if err := sqlite.DeclineGroupRequest(groupID, requesterID); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, map[string]string{"status": "declined"})
	default:
		http.Error(w, "not found", http.StatusNotFound)
	}
}

func handleGroupPosts(w http.ResponseWriter, r *http.Request, groupID, userID int64) {
	member, err := sqlite.IsGroupMember(groupID, userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if !member {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	switch r.Method {
	case http.MethodGet:
		posts, err := sqlite.ListGroupPosts(groupID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, posts)
	case http.MethodPost:
		var body struct {
			Content  string `json:"content"`
			ImageURL string `json:"image_url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		if body.Content == "" {
			http.Error(w, "content required", http.StatusBadRequest)
			return
		}
		id, err := sqlite.CreateGroupPost(groupID, userID, body.Content, body.ImageURL)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]int64{"id": id})
	}
}

func handleGroupPostSubpath(w http.ResponseWriter, r *http.Request, action string, groupID, userID int64) {
	parts := strings.Split(action, "/")
	if len(parts) != 3 || parts[0] != "posts" || parts[2] != "comments" {
		http.NotFound(w, r)
		return
	}
	postID, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}
	post, err := sqlite.GetGroupPost(postID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if post == nil || post.GroupID != groupID {
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}
	member, err := sqlite.IsGroupMember(groupID, userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if !member {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	switch r.Method {
	case http.MethodGet:
		comments, err := sqlite.ListGroupComments(postID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, comments)
	case http.MethodPost:
		var body struct {
			Content  string `json:"content"`
			ImageURL string `json:"image_url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		if body.Content == "" {
			http.Error(w, "content required", http.StatusBadRequest)
			return
		}
		id, err := sqlite.CreateGroupComment(postID, userID, body.Content, body.ImageURL)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]int64{"id": id})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}
