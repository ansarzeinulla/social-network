CREATE TABLE IF NOT EXISTS post_likes (
    user_id    INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    INTEGER  NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
