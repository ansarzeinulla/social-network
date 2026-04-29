package sqlite

import (
	"database/sql"
	"errors"
	"social-network/pkg/models"
)

func CreateUser(user models.User) (int64, error) {
	query := `
		INSERT INTO users (email, password, first_name, last_name, date_of_birth, avatar, nickname, about_me, is_public)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

	result, err := DB.Exec(query,
		user.Email,
		user.Password,
		user.FirstName,
		user.LastName,
		user.DateOfBirth,
		nullIfEmpty(user.Avatar),
		nullIfEmpty(user.Nickname),
		nullIfEmpty(user.AboutMe),
		user.IsPublic,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func GetUserByEmail(email string) (*models.User, error) {
	return scanUser(DB.QueryRow(`
		SELECT id, email, password, first_name, last_name, date_of_birth,
		       COALESCE(avatar, ''), COALESCE(cover, ''), COALESCE(nickname, ''), COALESCE(about_me, ''),
		       is_public, created_at
		FROM users WHERE email = ?`, email))
}

func GetUserByID(id int64) (*models.User, error) {
	return scanUser(DB.QueryRow(`
		SELECT id, email, password, first_name, last_name, date_of_birth,
		       COALESCE(avatar, ''), COALESCE(cover, ''), COALESCE(nickname, ''), COALESCE(about_me, ''),
		       is_public, created_at
		FROM users WHERE id = ?`, id))
}

func scanUser(row *sql.Row) (*models.User, error) {
	var u models.User
	err := row.Scan(
		&u.ID, &u.Email, &u.Password, &u.FirstName, &u.LastName, &u.DateOfBirth,
		&u.Avatar, &u.Cover, &u.Nickname, &u.AboutMe,
		&u.IsPublic, &u.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

// UpdateUserAvatar replaces the avatar path for a user. Pass "" to clear.
func UpdateUserAvatar(userID int64, url string) error {
	_, err := DB.Exec(`UPDATE users SET avatar = ? WHERE id = ?`, nullIfEmpty(url), userID)
	return err
}

// UpdateUserCover replaces the cover photo path for a user. Pass "" to clear.
func UpdateUserCover(userID int64, url string) error {
	_, err := DB.Exec(`UPDATE users SET cover = ? WHERE id = ?`, nullIfEmpty(url), userID)
	return err
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func GetFollowersOfUser(userID int64) ([]models.User, error) {
	query := `
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar, '')
		FROM users u
		JOIN followers f ON u.id = f.follower_id
		WHERE f.followee_id = ? AND f.status = 'accepted'`

	rows, err := DB.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var followers []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Nickname, &u.Avatar); err != nil {
			return nil, err
		}
		followers = append(followers, u)
	}
	return followers, nil
}
