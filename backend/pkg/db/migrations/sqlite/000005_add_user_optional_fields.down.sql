-- SQLite supports DROP COLUMN since 3.35 (mattn/go-sqlite3 ships with newer).
ALTER TABLE users DROP COLUMN about_me;
ALTER TABLE users DROP COLUMN nickname;
ALTER TABLE users DROP COLUMN avatar;
