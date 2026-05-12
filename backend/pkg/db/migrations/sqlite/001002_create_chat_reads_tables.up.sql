-- Per-user "last read" markers so we can compute unread message counts per
-- chat thread on the server. UI shows a pill badge with this count.

CREATE TABLE IF NOT EXISTS chat_reads (
    user_id      INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    peer_id      INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, peer_id)
);

CREATE TABLE IF NOT EXISTS group_chat_reads (
    user_id      INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id     INTEGER  NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_reads_user ON chat_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_reads_user ON group_chat_reads(user_id);
