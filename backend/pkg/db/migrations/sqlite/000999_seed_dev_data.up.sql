-- Seed test data for development.
-- Idempotent (INSERT OR IGNORE). Runs once via golang-migrate, but re-running
-- on a fresh DB (delete *.db) will recreate the same fixtures with same IDs.
--
-- All seed users have password = "Test123!"
-- Login as: alice@test.com / Test123!  (or any of bob/carol/dave/eve/frank)
--
-- After Step 1 (avatar/nickname/about_me migration 000005), this seed will be
-- updated to populate those fields too.

-- ============================================================
-- USERS (ids 1-7, password "Test123!" bcrypt hash, fixed cost 10)
-- ============================================================
INSERT OR IGNORE INTO users (id, email, password, first_name, last_name, date_of_birth, avatar, nickname, about_me, is_public, created_at) VALUES
    (1, 'alice@test.com', '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Alice', 'Anderson', '1995-03-12', NULL, 'alice_a', 'Software engineer who loves Go and TDD.', 1, '2026-01-10 10:00:00'),
    (2, 'bob@test.com',   '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Bob',   'Brown',    '1992-07-05', NULL, 'bobster',  'Full-stack dev. Coffee and code.',         1, '2026-01-11 11:00:00'),
    (3, 'carol@test.com', '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Carol', 'Clark',    '1998-11-22', NULL, 'carolc',   NULL,                                       0, '2026-01-12 12:00:00'),
    (4, 'dave@test.com',  '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Dave',  'Davis',    '1990-02-28', NULL, 'davidd',   'Backend, distributed systems, V60 brewer.', 1, '2026-01-13 13:00:00'),
    (5, 'eve@test.com',   '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Eve',   'Evans',    '2001-09-09', NULL, NULL,       NULL,                                       0, '2026-01-14 14:00:00'),
    (6, 'frank@test.com', '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Frank', 'Foster',   '1989-06-15', NULL, 'frankf',   'Photographer, traveler.',                  1, '2026-01-15 15:00:00'),
    (7, 'demo@test.com',  '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Demo',  'User',     '1995-01-01', NULL, 'demo',     'Demo account for testing.',                1, '2026-01-16 16:00:00');

-- ============================================================
-- FOLLOWERS
-- ============================================================
-- Alice -> Bob (accepted), Bob -> Alice (accepted)  → mutual
-- Alice -> Carol (pending) — Carol is private, hasn't accepted yet
-- Bob -> Carol (accepted) — Carol accepted Bob
-- Dave -> Alice (accepted)
-- Eve -> Alice (pending) — Alice is public, but in seed we leave one pending
-- Frank -> Dave (accepted)
INSERT OR IGNORE INTO followers (follower_id, followee_id, status, created_at) VALUES
    (1, 2, 'accepted', '2026-01-20 10:00:00'),
    (2, 1, 'accepted', '2026-01-20 10:05:00'),
    (1, 3, 'pending',  '2026-01-21 11:00:00'),
    (2, 3, 'accepted', '2026-01-21 12:00:00'),
    (4, 1, 'accepted', '2026-01-22 09:00:00'),
    (5, 1, 'pending',  '2026-01-23 14:00:00'),
    (6, 4, 'accepted', '2026-01-24 15:00:00'),
    (3, 2, 'accepted', '2026-01-25 16:00:00');

-- ============================================================
-- POSTS (privacy: public / almost_private / private)
-- ============================================================
-- post.title was dropped in migration 000017 — FB-like posts are content-only.
INSERT OR IGNORE INTO posts (id, user_id, content, image_url, privacy, created_at) VALUES
    (1, 1, 'My first post here. Excited to be on this network!',          NULL, 'public',         '2026-02-01 10:00:00'),
    (2, 1, 'Some thoughts I want to share with my followers only.',       NULL, 'almost_private', '2026-02-02 11:00:00'),
    (3, 2, 'Just a quick note about my day. The weather is great today!', NULL, 'public',         '2026-02-03 12:00:00'),
    (4, 2, 'A more personal thought, only for selected followers.',       NULL, 'private',        '2026-02-04 13:00:00'),
    (5, 3, 'Carol shares only with her network.',                         NULL, 'public',         '2026-02-05 14:00:00'),
    (6, 4, 'Today I learned about TDD and it changed how I write code.',  NULL, 'public',         '2026-02-06 15:00:00'),
    (7, 6, 'Just got back from a trip. Lots of stories to tell.',         NULL, 'almost_private', '2026-02-07 16:00:00');

-- post 4 is private, only user 1 (Alice) and user 4 (Dave) can see it
INSERT OR IGNORE INTO post_viewers (post_id, user_id) VALUES
    (4, 1),
    (4, 4);

-- ============================================================
-- COMMENTS
-- ============================================================
INSERT OR IGNORE INTO comments (id, post_id, user_id, content, image_url, created_at) VALUES
    (1, 1, 2, 'Welcome, Alice!',                 NULL, '2026-02-01 10:30:00'),
    (2, 1, 4, 'Great to see you here.',          NULL, '2026-02-01 11:00:00'),
    (3, 3, 1, 'Sounds nice, Bob!',               NULL, '2026-02-03 13:00:00'),
    (4, 6, 1, 'TDD is a game-changer indeed.',   NULL, '2026-02-06 16:00:00'),
    (5, 6, 2, 'Which framework did you start with?', NULL, '2026-02-06 17:00:00');

-- ============================================================
-- GROUPS
-- ============================================================
INSERT OR IGNORE INTO groups (id, creator_id, title, description, created_at) VALUES
    (1, 1, 'Go Developers',  'Community for people learning and using Go.',           '2026-03-01 10:00:00'),
    (2, 2, 'TDD Practice',   'Daily TDD katas and pair programming.',                 '2026-03-02 11:00:00'),
    (3, 4, 'Coffee Lovers',  'Share your favorite beans and brewing techniques.',     '2026-03-03 12:00:00');

-- ============================================================
-- GROUP MEMBERS (statuses: invited / requested / member)
-- ============================================================
-- Group 1 (Go Developers): creator Alice, members Bob and Dave, Eve invited
INSERT OR IGNORE INTO group_members (group_id, user_id, status, created_at) VALUES
    (1, 1, 'member',    '2026-03-01 10:00:00'),
    (1, 2, 'member',    '2026-03-01 11:00:00'),
    (1, 4, 'member',    '2026-03-01 12:00:00'),
    (1, 5, 'invited',   '2026-03-01 13:00:00'),
    -- Group 2 (TDD): creator Bob, members Alice and Frank
    (2, 2, 'member',    '2026-03-02 11:00:00'),
    (2, 1, 'member',    '2026-03-02 12:00:00'),
    (2, 6, 'member',    '2026-03-02 13:00:00'),
    (2, 3, 'requested', '2026-03-02 14:00:00'),
    -- Group 3 (Coffee): creator Dave, members Frank
    (3, 4, 'member',    '2026-03-03 12:00:00'),
    (3, 6, 'member',    '2026-03-03 13:00:00');

-- ============================================================
-- GROUP POSTS
-- ============================================================
INSERT OR IGNORE INTO group_posts (id, group_id, user_id, content, image_url, created_at) VALUES
    (1, 1, 1, 'Welcome to the Go Developers group!',                            NULL, '2026-03-05 10:00:00'),
    (2, 1, 2, 'Anyone working on a hobby project? Share what you are building.', NULL, '2026-03-05 11:00:00'),
    (3, 2, 2, 'Today: write a kata for FizzBuzz with TDD.',                     NULL, '2026-03-06 10:00:00'),
    (4, 3, 4, 'I just got a V60 — recipes welcome!',                            NULL, '2026-03-07 10:00:00');

-- ============================================================
-- GROUP COMMENTS
-- ============================================================
INSERT OR IGNORE INTO group_comments (id, group_post_id, user_id, content, image_url, created_at) VALUES
    (1, 1, 2, 'Thanks for the invite, Alice!',         NULL, '2026-03-05 10:15:00'),
    (2, 2, 4, 'Working on a CLI tool, will post soon.', NULL, '2026-03-05 11:30:00'),
    (3, 3, 1, 'I am in. Pair?',                         NULL, '2026-03-06 10:30:00');

-- ============================================================
-- GROUP EVENTS
-- ============================================================
INSERT OR IGNORE INTO group_events (id, group_id, creator_id, title, description, event_date, created_at) VALUES
    (1, 1, 1, 'Go meetup #1',         'First in-person meetup. Coffee and code.', '2026-05-15 18:00:00', '2026-04-01 10:00:00'),
    (2, 2, 2, 'TDD pair session',     'Pair programming with TDD katas.',         '2026-05-20 19:00:00', '2026-04-02 11:00:00'),
    (3, 3, 4, 'Coffee tasting',       'Bring 100g of your favorite beans.',       '2026-06-01 16:00:00', '2026-04-03 12:00:00');

-- ============================================================
-- EVENT POLLS (votes: going / not_going)
-- ============================================================
INSERT OR IGNORE INTO event_polls (event_id, user_id, vote) VALUES
    (1, 1, 'going'),
    (1, 2, 'going'),
    (1, 4, 'not_going'),
    (2, 2, 'going'),
    (2, 1, 'going'),
    (3, 4, 'going'),
    (3, 6, 'going');

-- ============================================================
-- CHATS (private 1:1 messages)
-- ============================================================
-- Alice <-> Bob conversation
INSERT OR IGNORE INTO chats (id, sender_id, receiver_id, content, created_at) VALUES
    (1, 1, 2, 'Hey Bob!',                               '2026-04-10 10:00:00'),
    (2, 2, 1, 'Hi Alice, how are you?',                 '2026-04-10 10:01:00'),
    (3, 1, 2, 'Doing great. Want to pair tomorrow?',    '2026-04-10 10:02:00'),
    (4, 2, 1, 'Sure — 10am?',                           '2026-04-10 10:03:00'),
    -- Alice <-> Dave
    (5, 1, 4, 'Dave, can you review my PR?',            '2026-04-11 14:00:00'),
    (6, 4, 1, 'On it — give me 10 min.',                '2026-04-11 14:05:00'),
    -- Bob <-> Frank
    (7, 2, 6, 'Frank, ready for the meetup?',           '2026-04-12 09:00:00'),
    (8, 6, 2, 'Yep, see you there.',                    '2026-04-12 09:05:00');

-- ============================================================
-- GROUP CHATS
-- ============================================================
INSERT OR IGNORE INTO group_chats (id, group_id, sender_id, content, created_at) VALUES
    (1, 1, 1, 'Welcome everyone!',              '2026-04-15 10:00:00'),
    (2, 1, 2, 'Hey, glad to be here.',          '2026-04-15 10:01:00'),
    (3, 1, 4, 'Looking forward to the meetup.', '2026-04-15 10:02:00'),
    (4, 2, 2, 'TDD katas tonight?',             '2026-04-16 19:00:00'),
    (5, 2, 1, 'Count me in.',                   '2026-04-16 19:05:00');

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
-- Alice (1) gets follow_request from Eve (5)
-- Carol (3) gets follow_request from Alice (1)
-- Eve (5) gets group_invite to group 1 from Alice (1)
-- Carol (3) gets group_request response from Bob (2) (group 2)
-- Members of group 1 get new_event from Alice (event 1)
INSERT OR IGNORE INTO notifications (id, receiver_id, sender_id, type, entity_id, is_read, created_at) VALUES
    (1, 1, 5, 'follow_request', NULL, 0, '2026-04-20 10:00:00'),
    (2, 3, 1, 'follow_request', NULL, 1, '2026-04-20 11:00:00'),
    (3, 5, 1, 'group_invite',   1,    0, '2026-04-20 12:00:00'),
    (4, 2, 3, 'group_request',  2,    0, '2026-04-20 13:00:00'),
    (5, 2, 1, 'new_event',      1,    0, '2026-04-21 10:00:00'),
    (6, 4, 1, 'new_event',      1,    1, '2026-04-21 10:00:00'),
    (7, 1, 2, 'new_event',      2,    0, '2026-04-22 11:00:00');
