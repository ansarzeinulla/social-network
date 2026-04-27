-- FB-like posts don't have a separate title — only content. Spec compliance.
-- SQLite 3.35+ supports DROP COLUMN; mattn/go-sqlite3 ships with newer.
ALTER TABLE posts DROP COLUMN title;
