CREATE TABLE IF NOT EXISTS event_polls (
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    vote TEXT CHECK(vote IN ('going', 'not_going')) NOT NULL,
    FOREIGN KEY (event_id) REFERENCES group_events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, user_id) -- Один юзер = один голос на ивенте
);