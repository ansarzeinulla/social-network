CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receiver_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL, -- Кто спровоцировал уведомление
    type TEXT CHECK(type IN ('follow_request', 'group_invite', 'group_request', 'new_event')) NOT NULL,
    entity_id INTEGER, -- Зависит от типа (ID группы или ID события)
    is_read BOOLEAN DEFAULT 0, -- 0 = новое, 1 = прочитано
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);