-- Rollback: restore the original 4-type CHECK constraint.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS notifications_old (
    id          INTEGER   PRIMARY KEY AUTOINCREMENT,
    receiver_id INTEGER   NOT NULL,
    sender_id   INTEGER   NOT NULL,
    type        TEXT      CHECK(type IN ('follow_request', 'group_invite', 'group_request', 'new_event')) NOT NULL,
    entity_id   INTEGER,
    is_read     BOOLEAN   DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO notifications_old (id, receiver_id, sender_id, type, entity_id, is_read, created_at)
SELECT id, receiver_id, sender_id, type, entity_id, is_read, created_at
FROM notifications
WHERE type IN ('follow_request', 'group_invite', 'group_request', 'new_event');

DROP TABLE notifications;
ALTER TABLE notifications_old RENAME TO notifications;

PRAGMA foreign_keys = ON;
