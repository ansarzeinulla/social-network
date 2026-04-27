-- Adds optional profile fields required by spec:
-- "Avatar/Image, Nickname and About Me should be present in the registration
-- form but the user can skip the filling of those fields."
-- Fills the numbering gap (000004 -> 000006).

ALTER TABLE users ADD COLUMN avatar   TEXT;
ALTER TABLE users ADD COLUMN nickname TEXT;
ALTER TABLE users ADD COLUMN about_me TEXT;
