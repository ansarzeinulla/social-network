package sqlite

import (
	"database/sql"
	"errors"
	"social-network/pkg/models"
)

func CreateUser(user models.User) (int64, error) {
	query := `
		INSERT INTO users (email, password, first_name, last_name, date_of_birth)
		VALUES (?, ?, ?, ?, ?)`

	result, err := DB.Exec(query, user.Email, user.Password, user.FirstName, user.LastName, user.DateOfBirth)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

func GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	query := `
		SELECT id, email, password, first_name, last_name, date_of_birth, created_at
		FROM users WHERE email = ?`

	row := DB.QueryRow(query, email)
	err := row.Scan(&user.ID, &user.Email, &user.Password, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

func GetUserByID(id int64) (*models.User, error) {
	var user models.User
	query := `
		SELECT id, email, password, first_name, last_name, date_of_birth, created_at
		FROM users WHERE id = ?`

	row := DB.QueryRow(query, id)
	err := row.Scan(&user.ID, &user.Email, &user.Password, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

func GetFollowersOfUser(userID int64) ([]models.User, error) {
	query := `
		SELECT u.id, u.first_name, u.last_name
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
		if err := rows.Scan(&u.ID, &u.FirstName, &u.LastName); err != nil {
			return nil, err
		}
		followers = append(followers, u)
	}
	return followers, nil
}
