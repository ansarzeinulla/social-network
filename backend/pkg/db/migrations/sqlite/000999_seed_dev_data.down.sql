-- Reverse seed: removes only the rows added by the up migration.
-- Schema rollback is handled by individual table migrations.

DELETE FROM notifications WHERE id <= 7;
DELETE FROM group_chats   WHERE id <= 5;
DELETE FROM chats         WHERE id <= 8;
DELETE FROM event_polls   WHERE event_id IN (1, 2, 3);
DELETE FROM group_events  WHERE id <= 3;
DELETE FROM group_comments WHERE id <= 3;
DELETE FROM group_posts   WHERE id <= 4;
DELETE FROM group_members WHERE group_id IN (1, 2, 3) AND user_id <= 7;
DELETE FROM groups        WHERE id <= 3;
DELETE FROM comments      WHERE id <= 5;
DELETE FROM post_viewers  WHERE post_id <= 7;
DELETE FROM posts         WHERE id <= 7;
DELETE FROM followers     WHERE follower_id <= 7 AND followee_id <= 7;
DELETE FROM users         WHERE id <= 7;
