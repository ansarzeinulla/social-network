package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/middleware"
	"social-network/pkg/models"
)

// PostLikeHandler toggles the current user's like on a post.
// POST /api/posts/{id}/like
// Response: { "liked": bool, "likes_count": int }
func PostLikeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// /api/posts/{id}/like
	path := strings.TrimSuffix(r.URL.Path, "/like")
	idStr := strings.TrimPrefix(path, "/api/posts/")
	postID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || postID == 0 {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	// Verify the post exists AND the user is allowed to see it. A user who
	// can't view a private post shouldn't be able to like it.
	post, err := sqlite.GetPostByID(postID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if post == nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}
	if !canViewPost(userID, post) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	// You can't like your own post — server-side guard so the rule holds even
	// if someone calls the API directly bypassing the UI.
	if post.UserID == userID {
		http.Error(w, "Нельзя лайкать собственный пост", http.StatusForbidden)
		return
	}

	liked, count, err := sqlite.TogglePostLike(userID, postID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"liked":       liked,
		"likes_count": count,
	})
}

// enrichPostsWithLikes mutates the given slice in place, setting LikesCount,
// IsLiked, and CommentsCount on each post based on bulk DB queries. One
// roundtrip per metric, regardless of post count. Failures degrade silently
// to zero counts rather than failing the whole feed render.
func enrichPostsWithLikes(userID int64, posts []models.Post) {
	if len(posts) == 0 {
		return
	}
	ids := make([]int64, len(posts))
	for i, p := range posts {
		ids[i] = p.ID
	}
	if counts, liked, err := sqlite.PostsLikesSummary(userID, ids); err == nil {
		for i := range posts {
			posts[i].LikesCount = counts[posts[i].ID]
			posts[i].IsLiked = liked[posts[i].ID]
		}
	}
	if commentCounts, err := sqlite.PostsCommentsCount(ids); err == nil {
		for i := range posts {
			posts[i].CommentsCount = commentCounts[posts[i].ID]
		}
	}
}

// PostLikersHandler returns the users who have liked the given post.
// GET /api/posts/{id}/likes
func PostLikersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// /api/posts/{id}/likes
	path := strings.TrimSuffix(r.URL.Path, "/likes")
	idStr := strings.TrimPrefix(path, "/api/posts/")
	postID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || postID == 0 {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	post, err := sqlite.GetPostByID(postID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if post == nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}
	if !canViewPost(userID, post) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	likers, err := sqlite.GetPostLikers(postID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(likers)
}
