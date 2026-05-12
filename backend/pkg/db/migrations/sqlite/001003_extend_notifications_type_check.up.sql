-- Extend the type CHECK constraint to include 'group_accepted' and
-- 'new_follower'. The original migration (000015) only allowed
-- follow_request / group_invite / group_request / new_event, so any code
-- creating a 'group_accepted' or 'new_follower' notification silently
-- failed with a constraint violation — the user never saw the push.
--
-- SQLite doesn't support ALTER TABLE ... DROP CONSTRAINT, so we rebuild
-- the table: copy data → drop old → rename new.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS notifications_new (
    id          INTEGER   PRIMARY KEY AUTOINCREMENT,
    receiver_id INTEGER   NOT NULL,
    sender_id   INTEGER   NOT NULL,
    type        TEXT      CHECK(type IN (
                              'follow_request',
                              'new_follower',
                              'group_invite',
                              'group_request',
                              'group_accepted',
                              'new_event'
                          )) NOT NULL,
    entity_id   INTEGER,
    is_read     BOOLEAN   DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO notifications_new (id, receiver_id, sender_id, type, entity_id, is_read, created_at)
SELECT id, receiver_id, sender_id, type, entity_id, is_read, created_at FROM notifications;

DROP TABLE notifications;
ALTER TABLE notifications_new RENAME TO notifications;

PRAGMA foreign_keys = ON;
