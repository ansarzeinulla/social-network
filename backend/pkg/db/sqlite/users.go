package sqlite

import (
	"database/sql"
	"errors"
	"time"
)

type User struct {
	ID          int64
	Email       string
	Password    string
	FirstName   string
	LastName    string
	DateOfBirth string
	Avatar      sql.NullString
	Nickname    sql.NullString
	AboutMe     sql.NullString
	CreatedAt   time.Time
}

func CreateUser(user User) (int64, error) {
	query := `
		INSERT INTO users (email, password, first_name, last_name, date_of_birth, avatar, nickname, about_me)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	result, err := DB.Exec(query, user.Email, user.Password, user.FirstName, user.LastName, user.DateOfBirth, user.Avatar, user.Nickname, user.AboutMe)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

func GetUserByEmail(email string) (*User, error) {
	var user User
	query := `
		SELECT id, email, password, first_name, last_name, date_of_birth, avatar, nickname, about_me, created_at
		FROM users WHERE email = ?`

	row := DB.QueryRow(query, email)
	err := row.Scan(&user.ID, &user.Email, &user.Password, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.Avatar, &user.Nickname, &user.AboutMe, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

func GetUserByID(id int64) (*User, error) {
	var user User
	query := `
		SELECT id, email, password, first_name, last_name, date_of_birth, avatar, nickname, about_me, created_at
		FROM users WHERE id = ?`

	row := DB.QueryRow(query, id)
	err := row.Scan(&user.ID, &user.Email, &user.Password, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.Avatar, &user.Nickname, &user.AboutMe, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}
