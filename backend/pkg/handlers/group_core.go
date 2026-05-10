package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

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
		if status == "requested" {
			if g, err := sqlite.GetGroup(gid, userID); err == nil && g != nil && g.CreatorID != userID {
				eid := gid
				_, _ = sqlite.CreateNotification(g.CreatorID, userID, "group_request", &eid)
			}
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

	case action == "events" && (r.Method == http.MethodGet || r.Method == http.MethodPost):
		handleGroupEvents(w, r, gid, userID)

	case strings.HasPrefix(action, "events/"):
		handleGroupEventSubpath(w, r, action, gid, userID)

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

func handleGroupEvents(w http.ResponseWriter, r *http.Request, groupID, userID int64) {
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
		events, err := sqlite.ListGroupEvents(groupID, userID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, events)
	case http.MethodPost:
		var body struct {
			Title       string   `json:"title"`
			Description string   `json:"description"`
			EventDate   string   `json:"event_date"`
			Options     []string `json:"options"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		if body.Title == "" || body.EventDate == "" {
			http.Error(w, "title and event_date required", http.StatusBadRequest)
			return
		}
		if len(body.Options) > 0 && !validEventOptions(body.Options) {
			http.Error(w, "invalid event options", http.StatusBadRequest)
			return
		}
		eventTime, err := parseEventTime(body.EventDate)
		if err != nil {
			http.Error(w, "invalid event_date", http.StatusBadRequest)
			return
		}
		if !eventTime.After(time.Now()) {
			http.Error(w, "event_date must be in the future", http.StatusBadRequest)
			return
		}
		id, err := sqlite.CreateGroupEvent(groupID, userID, body.Title, body.Description, eventTime.Format("2006-01-02 15:04:05"))
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		if members, err := sqlite.ListGroupMembers(groupID); err == nil {
			for _, member := range members {
				if member.ID == userID {
					continue
				}
				eid := id
				_, _ = sqlite.CreateNotification(member.ID, userID, "new_event", &eid)
			}
		}
		writeJSON(w, map[string]any{"id": id, "options": []string{"going", "not_going"}})
	}
}

func handleGroupEventSubpath(w http.ResponseWriter, r *http.Request, action string, groupID, userID int64) {
	parts := strings.Split(action, "/")
	if len(parts) != 3 || parts[0] != "events" || parts[2] != "vote" {
		http.NotFound(w, r)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	eventID, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}
	ev, err := sqlite.GetGroupEvent(eventID, userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if ev == nil || ev.GroupID != groupID {
		http.Error(w, "event not found", http.StatusNotFound)
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
	var body struct {
		Vote string `json:"vote"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if body.Vote != "going" && body.Vote != "not_going" {
		http.Error(w, "invalid vote", http.StatusBadRequest)
		return
	}
	if err := sqlite.VoteGroupEvent(eventID, userID, body.Vote); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"vote": body.Vote})
}

func validEventOptions(options []string) bool {
	if len(options) < 2 {
		return false
	}
	seen := map[string]bool{}
	for _, opt := range options {
		if opt != "going" && opt != "not_going" {
			return false
		}
		seen[opt] = true
	}
	return seen["going"] && seen["not_going"]
}

func parseEventTime(raw string) (time.Time, error) {
	layouts := []string{
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	var lastErr error
	for _, layout := range layouts {
		t, err := time.Parse(layout, raw)
		if err == nil {
			return t, nil
		}
		lastErr = err
	}
	return time.Time{}, lastErr
}
