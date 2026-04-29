package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
	"social-network/pkg/utils"
)

// MeResponse is the JSON shape returned by /api/profile (own) and /api/profile/{id} (others).
// Counts are denormalized for cheap profile-page rendering.
type MeResponse struct {
	ID             int64  `json:"id"`
	Email          string `json:"email,omitempty"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	Nickname       string `json:"nickname,omitempty"`
	Avatar         string `json:"avatar,omitempty"`
	Cover          string `json:"cover,omitempty"`
	AboutMe        string `json:"about_me,omitempty"`
	IsPublic       bool   `json:"is_public"`
	IsSelf         bool   `json:"is_self"`
	IsFollowing    bool   `json:"is_following"`
	IsPending      bool   `json:"is_pending"`
	FollowersCount int    `json:"followers_count"`
	FollowingCount int    `json:"following_count"`
}

// ProfileHandler routes:
//   - GET  /api/profile         -> caller's own profile (always full)
//   - GET  /api/profile/{id}    -> someone else's profile (respects privacy)
//   - PATCH /api/profile/privacy -> flip caller's is_public
func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if r.URL.Path == "/api/profile/privacy" && (r.Method == http.MethodPatch || r.Method == http.MethodPost) {
		setPrivacy(w, r, userID)
		return
	}
	if r.URL.Path == "/api/profile/avatar" && r.Method == http.MethodPost {
		uploadAvatar(w, r, userID)
		return
	}
	if r.URL.Path == "/api/profile/cover" && r.Method == http.MethodPost {
		uploadCover(w, r, userID)
		return
	}

	// Determine target ID.
	targetID := userID
	if rest := strings.TrimPrefix(r.URL.Path, "/api/profile"); rest != "" {
		rest = strings.TrimPrefix(rest, "/")
		if rest != "me" && rest != "" {
			parsed, err := strconv.ParseInt(rest, 10, 64)
			if err != nil {
				http.Error(w, "invalid user id", http.StatusBadRequest)
				return
			}
			targetID = parsed
		}
	}

	target, err := sqlite.GetUserByID(targetID)
	if err != nil || target == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	resp := MeResponse{
		ID:        target.ID,
		FirstName: target.FirstName,
		LastName:  target.LastName,
		Nickname:  target.Nickname,
		Avatar:    target.Avatar,
		Cover:     target.Cover,
		IsPublic:  target.IsPublic,
		IsSelf:    target.ID == userID,
	}

	// Only the user themselves sees their own email.
	if resp.IsSelf {
		resp.Email = target.Email
	}

	// Privacy gate: about_me + counts are hidden if profile is private and viewer is not following.
	visible := target.IsPublic || resp.IsSelf
	if !visible {
		state, _ := sqlite.GetFollowState(userID, targetID)
		visible = state.Status == "accepted"
		resp.IsFollowing = state.Status == "accepted"
		resp.IsPending = state.Status == "pending"
	} else if !resp.IsSelf {
		state, _ := sqlite.GetFollowState(userID, targetID)
		resp.IsFollowing = state.Status == "accepted"
		resp.IsPending = state.Status == "pending"
	}

	if visible {
		resp.AboutMe = target.AboutMe
		if followers, err := sqlite.ListFollowers(target.ID); err == nil {
			resp.FollowersCount = len(followers)
		}
		if following, err := sqlite.ListFollowing(target.ID); err == nil {
			resp.FollowingCount = len(following)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func setPrivacy(w http.ResponseWriter, r *http.Request, userID int64) {
	var body struct {
		IsPublic bool `json:"is_public"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if _, err := sqlite.DB.Exec(`UPDATE users SET is_public = ? WHERE id = ?`, body.IsPublic, userID); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]bool{"is_public": body.IsPublic})
}

// uploadAvatar accepts a multipart form with field "avatar", validates MIME,
// saves to ./data/uploads, and updates users.avatar.
func uploadAvatar(w http.ResponseWriter, r *http.Request, userID int64) {
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		http.Error(w, "invalid form", http.StatusBadRequest)
		return
	}
	url, err := utils.ProcessImageUpload(r, "avatar", "./data/uploads")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if url == "" {
		http.Error(w, "no file uploaded", http.StatusBadRequest)
		return
	}
	if err := sqlite.UpdateUserAvatar(userID, url); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"avatar": url})
}

// uploadCover accepts a multipart form with field "cover" and updates users.cover.
func uploadCover(w http.ResponseWriter, r *http.Request, userID int64) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "invalid form", http.StatusBadRequest)
		return
	}
	url, err := utils.ProcessImageUpload(r, "cover", "./data/uploads")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if url == "" {
		http.Error(w, "no file uploaded", http.StatusBadRequest)
		return
	}
	if err := sqlite.UpdateUserCover(userID, url); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"cover": url})
}
