-- Seed test data for development.
-- Idempotent (INSERT OR IGNORE). Runs once via golang-migrate, but re-running
-- on a fresh DB (delete *.db) will recreate the same fixtures with same IDs.
--
-- All seed users have password = "Test123!"
-- Login as: alice@test.com / Test123!  (or any of bob/carol/dave/eve/frank)
--
-- Image URLs reference SVG placeholders in /app/data/uploads/, baked into
-- the backend Docker image (see Dockerfile + backend/seed_uploads/).
-- Served by the http.FileServer mount at /uploads/.

-- ============================================================
-- USERS (ids 1-7, password "Test123!" bcrypt hash, fixed cost 10)
-- ============================================================
INSERT OR IGNORE INTO users (id, email, password, first_name, last_name, date_of_birth, avatar, cover, nickname, about_me, is_public, created_at) VALUES
    (1, 'alice@test.com', '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Alice', 'Anderson', '1995-03-12', '/uploads/seed-av-alice.svg', '/uploads/seed-code.svg',    'alice_a', 'Software engineer who loves Go and TDD. Coffee in the morning, code in the afternoon, books in the evening.',   1, '2026-01-10 10:00:00'),
    (2, 'bob@test.com',   '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Bob',   'Brown',    '1992-07-05', '/uploads/seed-av-bob.svg',   '/uploads/seed-meetup.svg',  'bobster', 'Full-stack dev. Coffee and code. Building side projects every weekend.',                                            1, '2026-01-11 11:00:00'),
    (3, 'carol@test.com', '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Carol', 'Clark',    '1998-11-22', '/uploads/seed-av-carol.svg', '/uploads/seed-celebrate.svg', 'carolc', 'Product designer. Sketchy by trade, opinionated by nature.',                                                       0, '2026-01-12 12:00:00'),
    (4, 'dave@test.com',  '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Dave',  'Davis',    '1990-02-28', '/uploads/seed-av-dave.svg',  '/uploads/seed-coffee.svg',  'davidd',  'Backend, distributed systems, V60 brewer. Coffee snob and proud.',                                                  1, '2026-01-13 13:00:00'),
    (5, 'eve@test.com',   '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Eve',   'Evans',    '2001-09-09', '/uploads/seed-av-eve.svg',   '/uploads/seed-nature.svg',  'eve_e',   'Hiker, runner, devops engineer when not outdoors.',                                                                 0, '2026-01-14 14:00:00'),
    (6, 'frank@test.com', '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Frank', 'Foster',   '1989-06-15', '/uploads/seed-av-frank.svg', '/uploads/seed-travel.svg',  'frankf',  'Photographer, traveler. 32 countries and counting.',                                                                1, '2026-01-15 15:00:00'),
    (7, 'demo@test.com',  '$2a$10$n0ZtOe43nvkcaFUS.nmY4elX3n3k2F1jaFX9Aa4W3Xi3S2wK9vIuy', 'Demo',  'User',     '1995-01-01', NULL,                          NULL,                        'demo',    'Demo account for testing.',                                                                                         1, '2026-01-16 16:00:00');

-- ============================================================
-- FOLLOWERS
-- ============================================================
-- Alice <-> Bob mutual, Alice -> Carol pending, Bob -> Carol accepted,
-- Dave -> Alice accepted, Eve -> Alice pending, Frank -> Dave accepted,
-- plus extras for visual richness.
INSERT OR IGNORE INTO followers (follower_id, followee_id, status, created_at) VALUES
    (1, 2, 'accepted', '2026-01-20 10:00:00'),
    (2, 1, 'accepted', '2026-01-20 10:05:00'),
    (1, 3, 'pending',  '2026-01-21 11:00:00'),
    (2, 3, 'accepted', '2026-01-21 12:00:00'),
    (4, 1, 'accepted', '2026-01-22 09:00:00'),
    (5, 1, 'pending',  '2026-01-23 14:00:00'),
    (6, 4, 'accepted', '2026-01-24 15:00:00'),
    (3, 2, 'accepted', '2026-01-25 16:00:00'),
    (1, 4, 'accepted', '2026-01-26 09:00:00'),
    (1, 6, 'accepted', '2026-01-26 10:00:00'),
    (4, 2, 'accepted', '2026-01-26 11:00:00'),
    (6, 1, 'accepted', '2026-01-26 12:00:00'),
    (2, 6, 'accepted', '2026-01-27 09:00:00'),
    (4, 6, 'accepted', '2026-01-27 10:00:00');

-- ============================================================
-- POSTS (privacy: public / almost_private / private)
-- ============================================================
INSERT OR IGNORE INTO posts (id, user_id, content, image_url, privacy, created_at) VALUES
    (1,  1, 'My first post here. Excited to be on this network!',                                                  NULL,                          'public',         '2026-02-01 10:00:00'),
    (2,  1, 'Working on a new Go package — generic queue with optional persistence. Anyone interested in a beta?', '/uploads/seed-code.svg',      'public',         '2026-02-02 11:00:00'),
    (3,  1, 'Some thoughts I want to share only with my followers.',                                               NULL,                          'almost_private', '2026-02-03 09:30:00'),
    (4,  2, 'Just a quick note about my day. The weather is great today!',                                         NULL,                          'public',         '2026-02-03 12:00:00'),
    (5,  2, 'Coffee setup upgrade complete. Hario V60, fresh-roasted beans, and a kettle that holds 95°C.',        '/uploads/seed-coffee.svg',    'public',         '2026-02-04 08:30:00'),
    (6,  2, 'A more personal thought, only for selected followers.',                                               NULL,                          'private',        '2026-02-04 13:00:00'),
    (7,  3, 'Carol shares only with her network. Design crit on Friday, anyone?',                                  '/uploads/seed-celebrate.svg', 'public',         '2026-02-05 14:00:00'),
    (8,  4, 'Today I learned about TDD and it changed how I write code. Red, green, refactor, repeat.',            '/uploads/seed-code.svg',      'public',         '2026-02-06 15:00:00'),
    (9,  4, 'New espresso recipe: 18g in, 36g out, 28s extraction. Bright, fruity, very pleased.',                 '/uploads/seed-coffee.svg',    'public',         '2026-02-07 08:00:00'),
    (10, 6, 'Just got back from a trip. Lots of stories to tell — and a memory card full of photos.',              '/uploads/seed-travel.svg',    'almost_private', '2026-02-07 16:00:00'),
    (11, 6, 'Sunset over the mountains. No filter. The colors did all the work.',                                  '/uploads/seed-nature.svg',    'public',         '2026-02-08 19:30:00'),
    (12, 5, 'First trail run of the year. Legs are dead but the views were worth it.',                             '/uploads/seed-nature.svg',    'public',         '2026-02-09 11:00:00'),
    (13, 1, 'Shipped v0.2 of my side project today. Small win, big day.',                                          '/uploads/seed-launch.svg',    'public',         '2026-02-10 18:00:00'),
    (14, 2, 'Friday meetup confirmed. See some of you there!',                                                     '/uploads/seed-meetup.svg',    'public',         '2026-02-11 14:00:00'),
    (15, 4, 'Birthday cake at the office today. The team baked it themselves.',                                    '/uploads/seed-food.svg',      'almost_private', '2026-02-12 17:00:00'),
    (16, 3, 'New design system component shipped — 12 variants, all accessible, all dark-mode ready.',             '/uploads/seed-celebrate.svg', 'public',         '2026-02-13 12:00:00'),
    (17, 6, 'Local market finds: peppers, fresh bread, olives, and a tiny jar of saffron.',                        '/uploads/seed-food.svg',      'public',         '2026-02-14 09:00:00');

-- post 6 is private, only Alice (1) and Dave (4) can see it
-- post 3 is almost_private — visible to Alice's followers (Bob, Dave, Frank)
INSERT OR IGNORE INTO post_viewers (post_id, user_id) VALUES
    (6, 1),
    (6, 4);

-- ============================================================
-- COMMENTS
-- ============================================================
INSERT OR IGNORE INTO comments (id, post_id, user_id, content, image_url, created_at) VALUES
    (1,  1,  2, 'Welcome, Alice! Glad to have you here.',                NULL,                          '2026-02-01 10:30:00'),
    (2,  1,  4, 'Great to see you here. Long time no chat.',             NULL,                          '2026-02-01 11:00:00'),
    (3,  2,  4, 'Persistent queue in Go is on my "I should write this" list. Mind if I take a look?', NULL, '2026-02-02 14:00:00'),
    (4,  2,  2, 'Generics + queues = my favorite Tuesday.',              '/uploads/seed-code.svg',      '2026-02-02 14:30:00'),
    (5,  4,  1, 'Sounds nice, Bob! Weather here is the opposite — pouring rain.', NULL,                 '2026-02-03 13:00:00'),
    (6,  5,  4, 'V60 is the right call. What grinder?',                  '/uploads/seed-coffee.svg',    '2026-02-04 09:00:00'),
    (7,  5,  1, 'I keep meaning to upgrade my coffee setup. This is a sign.', NULL,                     '2026-02-04 10:00:00'),
    (8,  7,  1, 'I am in. Send the deck before Thursday.',                NULL,                          '2026-02-05 15:30:00'),
    (9,  8,  1, 'TDD is a game-changer indeed. Took me a year to internalise the rhythm.', NULL,        '2026-02-06 16:00:00'),
    (10, 8,  2, 'Which framework did you start with? Ginkgo or stdlib?', NULL,                          '2026-02-06 17:00:00'),
    (11, 9,  6, 'Recipe looks dialled. Mind sharing the bean?',          NULL,                          '2026-02-07 09:00:00'),
    (12, 10, 1, 'Pictures, pictures, pictures!',                          '/uploads/seed-travel.svg',    '2026-02-07 18:00:00'),
    (13, 11, 4, 'That is straight-up wallpaper material.',                NULL,                          '2026-02-08 20:00:00'),
    (14, 11, 2, 'Where was this taken?',                                  NULL,                          '2026-02-08 21:30:00'),
    (15, 12, 6, 'Trail running is the best meditation I know.',           '/uploads/seed-nature.svg',    '2026-02-09 13:00:00'),
    (16, 13, 2, 'Congrats! What was the biggest blocker?',                NULL,                          '2026-02-10 19:00:00'),
    (17, 13, 4, 'V0.2 already? You started this last month.',             '/uploads/seed-launch.svg',    '2026-02-10 19:30:00'),
    (18, 14, 6, 'Will try to make it.',                                   NULL,                          '2026-02-11 15:00:00'),
    (19, 15, 1, 'Send a slice 📦',                                        '/uploads/seed-food.svg',      '2026-02-12 17:30:00'),
    (20, 16, 1, 'The 12-variant thing is the dream. Mind if I borrow your matrix template?', NULL,      '2026-02-13 13:00:00'),
    (21, 17, 2, 'Saffron in this economy? Living the dream.',             NULL,                          '2026-02-14 09:30:00');

-- ============================================================
-- GROUPS
-- ============================================================
INSERT OR IGNORE INTO groups (id, creator_id, title, description, created_at) VALUES
    (1, 1, 'Go Developers',  'Community for people learning and using Go. Weekly meetups, code reviews, open-source coordination.', '2026-03-01 10:00:00'),
    (2, 2, 'TDD Practice',   'Daily TDD katas and pair programming. All languages welcome.',                                          '2026-03-02 11:00:00'),
    (3, 4, 'Coffee Lovers',  'Share your favorite beans and brewing techniques. V60s, Aeropresses, and the occasional moka pot.',     '2026-03-03 12:00:00'),
    (4, 6, 'Travel Stories', 'Trip reports, photos, and hidden-gem recommendations.',                                                  '2026-03-04 09:00:00');

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
INSERT OR IGNORE INTO group_members (group_id, user_id, status, created_at) VALUES
    -- Group 1: Go Developers
    (1, 1, 'member',    '2026-03-01 10:00:00'),
    (1, 2, 'member',    '2026-03-01 11:00:00'),
    (1, 4, 'member',    '2026-03-01 12:00:00'),
    (1, 5, 'invited',   '2026-03-01 13:00:00'),
    (1, 6, 'member',    '2026-03-01 14:00:00'),
    -- Group 2: TDD Practice
    (2, 2, 'member',    '2026-03-02 11:00:00'),
    (2, 1, 'member',    '2026-03-02 12:00:00'),
    (2, 6, 'member',    '2026-03-02 13:00:00'),
    (2, 3, 'requested', '2026-03-02 14:00:00'),
    -- Group 3: Coffee Lovers
    (3, 4, 'member',    '2026-03-03 12:00:00'),
    (3, 6, 'member',    '2026-03-03 13:00:00'),
    (3, 2, 'member',    '2026-03-03 14:00:00'),
    (3, 1, 'requested', '2026-03-03 15:00:00'),
    -- Group 4: Travel Stories
    (4, 6, 'member',    '2026-03-04 09:00:00'),
    (4, 5, 'member',    '2026-03-04 10:00:00'),
    (4, 1, 'member',    '2026-03-04 11:00:00');

-- ============================================================
-- GROUP POSTS
-- ============================================================
INSERT OR IGNORE INTO group_posts (id, group_id, user_id, content, image_url, created_at) VALUES
    (1, 1, 1, 'Welcome to the Go Developers group! Quick intro thread below.',                NULL,                          '2026-03-05 10:00:00'),
    (2, 1, 2, 'Anyone working on a hobby project? Share what you are building.',              NULL,                          '2026-03-05 11:00:00'),
    (3, 1, 4, 'Just published a blog post on Go generics gotchas. Feedback welcome.',         '/uploads/seed-code.svg',      '2026-03-05 14:00:00'),
    (4, 1, 6, 'Hosting a Go session at our office next Friday. RSVPs in DM.',                 '/uploads/seed-meetup.svg',    '2026-03-06 09:00:00'),
    (5, 2, 2, 'Today: write a kata for FizzBuzz with TDD. Three steps, no skipping.',         NULL,                          '2026-03-06 10:00:00'),
    (6, 2, 1, 'Pair programming session tonight at 7pm. Who is in?',                          NULL,                          '2026-03-06 12:00:00'),
    (7, 2, 6, 'Just discovered table-driven tests in Go. Game-changer for kata practice.',    '/uploads/seed-code.svg',      '2026-03-07 11:00:00'),
    (8, 3, 4, 'I just got a V60 — recipes welcome!',                                          '/uploads/seed-coffee.svg',    '2026-03-07 10:00:00'),
    (9, 3, 6, 'Tried a Yirgacheffe this morning. Bright, citrusy, would buy again.',          '/uploads/seed-coffee.svg',    '2026-03-08 08:00:00'),
    (10,3, 2, 'Anyone done a side-by-side V60 vs Aeropress comparison?',                       NULL,                          '2026-03-08 09:30:00'),
    (11,4, 6, 'Just back from Lisbon. Photos in next post.',                                   '/uploads/seed-travel.svg',    '2026-03-09 18:00:00'),
    (12,4, 5, 'Hike of the year, North Cascades. The trail map says easy. It is not.',        '/uploads/seed-nature.svg',    '2026-03-10 11:00:00');

-- ============================================================
-- GROUP COMMENTS
-- ============================================================
INSERT OR IGNORE INTO group_comments (id, group_post_id, user_id, content, image_url, created_at) VALUES
    (1,  1,  2, 'Thanks for the invite, Alice!',                  NULL,                       '2026-03-05 10:15:00'),
    (2,  1,  4, 'Hi everyone. Mostly lurking but glad to be here.', NULL,                     '2026-03-05 10:30:00'),
    (3,  2,  4, 'Working on a CLI tool, will post soon.',           '/uploads/seed-code.svg', '2026-03-05 11:30:00'),
    (4,  2,  6, 'Building a tiny Markdown-to-HTML renderer for fun.', NULL,                  '2026-03-05 12:00:00'),
    (5,  3,  1, 'Great write-up. The bit on type sets clicked for me.', NULL,                '2026-03-05 15:00:00'),
    (6,  4,  2, 'Will be there. Bringing a friend if that is OK?',  NULL,                     '2026-03-06 10:00:00'),
    (7,  5,  1, 'I am in. Pair?',                                   NULL,                     '2026-03-06 10:30:00'),
    (8,  5,  6, 'I will lurk this round, learn the workflow.',      NULL,                     '2026-03-06 11:00:00'),
    (9,  6,  1, '7pm works.',                                       NULL,                     '2026-03-06 13:00:00'),
    (10, 7,  2, 'Table-driven tests are the canonical Go pattern. Welcome to the club.', NULL,'2026-03-07 11:30:00'),
    (11, 8,  6, 'Start with a 1:16 brew ratio, water at 92°C, 3:00 total.', '/uploads/seed-coffee.svg', '2026-03-07 11:00:00'),
    (12, 9,  4, 'Yirgacheffe is the gateway drug.',                 NULL,                     '2026-03-08 08:30:00'),
    (13, 10, 4, 'V60 is cleaner cup, Aeropress is more forgiving. Depends on the bean.', NULL,'2026-03-08 10:00:00'),
    (14, 11, 1, 'Lisbon!! Photos please.',                          NULL,                     '2026-03-09 18:30:00'),
    (15, 12, 6, 'North Cascades on the bucket list. Which trailhead?', '/uploads/seed-nature.svg', '2026-03-10 12:00:00');

-- ============================================================
-- GROUP EVENTS
-- ============================================================
INSERT OR IGNORE INTO group_events (id, group_id, creator_id, title, description, event_date, created_at) VALUES
    (1, 1, 1, 'Go meetup #1',         'First in-person meetup. Coffee and code.',                  '2026-05-15 18:00:00', '2026-04-01 10:00:00'),
    (2, 1, 1, 'Go generics deep-dive', 'Workshop on type sets, constraints, and real-world usage.', '2026-06-10 18:00:00', '2026-04-01 11:00:00'),
    (3, 2, 2, 'TDD pair session',     'Pair programming with TDD katas.',                          '2026-05-20 19:00:00', '2026-04-02 11:00:00'),
    (4, 3, 4, 'Coffee tasting',       'Bring 100g of your favorite beans.',                        '2026-06-01 16:00:00', '2026-04-03 12:00:00'),
    (5, 4, 6, 'Trip planning night',  'Plan a group weekend hike — bring maps.',                   '2026-06-15 19:00:00', '2026-04-04 13:00:00');

INSERT OR IGNORE INTO event_polls (event_id, user_id, vote) VALUES
    (1, 1, 'going'),
    (1, 2, 'going'),
    (1, 4, 'not_going'),
    (1, 6, 'going'),
    (2, 1, 'going'),
    (2, 2, 'going'),
    (2, 4, 'going'),
    (3, 2, 'going'),
    (3, 1, 'going'),
    (3, 6, 'not_going'),
    (4, 4, 'going'),
    (4, 6, 'going'),
    (4, 2, 'going'),
    (5, 6, 'going'),
    (5, 5, 'going'),
    (5, 1, 'not_going');

-- ============================================================
-- CHATS (private 1:1 messages)
-- ============================================================
INSERT OR IGNORE INTO chats (id, sender_id, receiver_id, content, created_at) VALUES
    -- Alice <-> Bob
    (1,  1, 2, 'Hey Bob!',                                       '2026-04-10 10:00:00'),
    (2,  2, 1, 'Hi Alice, how are you?',                         '2026-04-10 10:01:00'),
    (3,  1, 2, 'Doing great. Want to pair tomorrow?',            '2026-04-10 10:02:00'),
    (4,  2, 1, 'Sure — 10am?',                                   '2026-04-10 10:03:00'),
    (5,  1, 2, '10 works. Same Zoom link as last time.',         '2026-04-10 10:04:00'),
    (6,  2, 1, '👌',                                             '2026-04-10 10:05:00'),
    (7,  1, 2, 'BTW, did you see the new Go release notes?',     '2026-04-10 15:00:00'),
    (8,  2, 1, 'Skimmed them. Range over int looks cute.',       '2026-04-10 15:05:00'),
    -- Alice <-> Dave
    (9,  1, 4, 'Dave, can you review my PR?',                    '2026-04-11 14:00:00'),
    (10, 4, 1, 'On it — give me 10 min.',                        '2026-04-11 14:05:00'),
    (11, 4, 1, 'Left a couple of comments. Nothing blocking.',   '2026-04-11 14:25:00'),
    (12, 1, 4, 'Thanks! Will address them today.',               '2026-04-11 14:30:00'),
    (13, 1, 4, 'Coffee tomorrow morning?',                       '2026-04-11 18:00:00'),
    (14, 4, 1, 'Always yes to coffee.',                          '2026-04-11 18:02:00'),
    -- Alice <-> Frank
    (15, 1, 6, 'Frank, your Lisbon photos are stunning.',        '2026-04-12 11:00:00'),
    (16, 6, 1, 'Thanks! It was a 5-day trip, photos every day.', '2026-04-12 11:10:00'),
    (17, 1, 6, 'Will any of them end up as prints?',             '2026-04-12 11:12:00'),
    (18, 6, 1, 'Maybe a small set. Will keep you posted.',       '2026-04-12 11:15:00'),
    -- Bob <-> Frank
    (19, 2, 6, 'Frank, ready for the meetup?',                   '2026-04-12 09:00:00'),
    (20, 6, 2, 'Yep, see you there.',                            '2026-04-12 09:05:00'),
    (21, 2, 6, 'Bringing a friend who is new to Go.',            '2026-04-12 09:06:00'),
    (22, 6, 2, 'The more the merrier.',                          '2026-04-12 09:08:00'),
    -- Dave <-> Frank
    (23, 4, 6, 'Heard you got back from a trip. Beans report?',  '2026-04-13 10:00:00'),
    (24, 6, 4, 'Picked up a Yirgacheffe AND an Ethiopian Sidamo. You will love them.', '2026-04-13 10:30:00'),
    (25, 4, 6, 'Brewing the Yirgacheffe right now.',             '2026-04-14 08:00:00'),
    (26, 6, 4, 'How is it? Citrus?',                             '2026-04-14 08:05:00'),
    (27, 4, 6, 'Bright lemon, light caramel finish. Excellent.', '2026-04-14 08:10:00'),
    -- Bob <-> Carol
    (28, 2, 3, 'Carol, your design crit Friday — still on?',     '2026-04-15 12:00:00'),
    (29, 3, 2, 'On for sure. 4pm, my place.',                    '2026-04-15 12:30:00'),
    -- Alice <-> Carol (one-way, Carol private)
    (30, 1, 3, 'Hi Carol, would love to follow your work.',      '2026-04-15 16:00:00');

-- ============================================================
-- GROUP CHATS
-- ============================================================
INSERT OR IGNORE INTO group_chats (id, group_id, sender_id, content, created_at) VALUES
    -- Go Developers (1)
    (1,  1, 1, 'Welcome everyone! Quick intro round?',                   '2026-04-15 10:00:00'),
    (2,  1, 2, 'Hey, glad to be here. Building a Go CLI tool.',          '2026-04-15 10:01:00'),
    (3,  1, 4, 'Looking forward to the meetup.',                         '2026-04-15 10:02:00'),
    (4,  1, 6, 'Long-time Go dev, mostly backends.',                     '2026-04-15 10:03:00'),
    (5,  1, 1, 'Sweet. Drop your projects in the welcome thread!',       '2026-04-15 10:04:00'),
    (6,  1, 2, 'Anyone want to co-author a workshop talk?',              '2026-04-15 14:00:00'),
    (7,  1, 4, 'I would. Topic?',                                        '2026-04-15 14:02:00'),
    (8,  1, 2, 'Maybe context.Context patterns? Underrated.',            '2026-04-15 14:05:00'),
    -- TDD Practice (2)
    (9,  2, 2, 'TDD katas tonight at 7pm?',                              '2026-04-16 19:00:00'),
    (10, 2, 1, 'Count me in.',                                           '2026-04-16 19:05:00'),
    (11, 2, 6, 'Will join if I am back from work in time.',              '2026-04-16 19:10:00'),
    (12, 2, 2, 'Kata of the night: stringCalc, with TDD steps printed.', '2026-04-16 19:15:00'),
    (13, 2, 1, 'Classic. See you at 7.',                                 '2026-04-16 19:16:00'),
    -- Coffee Lovers (3)
    (14, 3, 4, 'Going to grab a new burr grinder. Recs?',                '2026-04-17 09:00:00'),
    (15, 3, 6, 'Comandante C40 if budget allows.',                       '2026-04-17 09:05:00'),
    (16, 3, 2, 'Or 1Zpresso JX-Pro if you want decent grind range.',     '2026-04-17 09:10:00'),
    (17, 3, 4, 'Solid recs. Will compare.',                              '2026-04-17 09:12:00'),
    -- Travel Stories (4)
    (18, 4, 6, 'Photos from the trip are uploading. Be patient.',        '2026-04-18 16:00:00'),
    (19, 4, 5, 'Cannot wait to see them!',                               '2026-04-18 16:02:00'),
    (20, 4, 1, 'Frank, where to next?',                                  '2026-04-18 16:05:00'),
    (21, 4, 6, 'Probably Iceland in autumn. Northern lights ☄',          '2026-04-18 16:10:00');

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
INSERT OR IGNORE INTO notifications (id, receiver_id, sender_id, type, entity_id, is_read, created_at) VALUES
    (1,  1, 5, 'follow_request', NULL, 0, '2026-04-20 10:00:00'),
    (2,  3, 1, 'follow_request', NULL, 1, '2026-04-20 11:00:00'),
    (3,  5, 1, 'group_invite',   1,    0, '2026-04-20 12:00:00'),
    (4,  2, 3, 'group_request',  2,    0, '2026-04-20 13:00:00'),
    (5,  4, 1, 'group_request',  3,    0, '2026-04-20 13:30:00'),
    (6,  2, 1, 'new_event',      1,    0, '2026-04-21 10:00:00'),
    (7,  4, 1, 'new_event',      1,    1, '2026-04-21 10:00:00'),
    (8,  6, 1, 'new_event',      1,    0, '2026-04-21 10:00:00'),
    (9,  1, 2, 'new_event',      3,    0, '2026-04-22 11:00:00'),
    (10, 6, 4, 'new_event',      4,    0, '2026-04-23 12:00:00'),
    (11, 5, 6, 'new_event',      5,    0, '2026-04-24 13:00:00'),
    (12, 1, 6, 'new_follower',   NULL, 1, '2026-04-25 09:00:00'),
    (13, 4, 6, 'new_follower',   NULL, 0, '2026-04-25 09:30:00');
