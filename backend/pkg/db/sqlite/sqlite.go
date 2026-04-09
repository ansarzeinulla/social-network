package sqlite

import (
    "database/sql"
    "fmt"

    "github.com/golang-migrate/migrate/v4"
    "github.com/golang-migrate/migrate/v4/database/sqlite3"
    _ "github.com/golang-migrate/migrate/v4/source/file"
    _ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB(dbPath string, migrationsPath string) error {
    var err error
    DB, err = sql.Open("sqlite3", dbPath)
    if err != nil {
        return fmt.Errorf("failed to open database: %w", err)
    }

    if err := DB.Ping(); err != nil {
        return fmt.Errorf("failed to ping database: %w", err)
    }

    if err := RunMigrations(DB, migrationsPath); err != nil {
        return fmt.Errorf("failed to run migrations: %w", err)
    }

    return nil
}

func RunMigrations(db *sql.DB, migrationsPath string) error {
    driver, err := sqlite3.WithInstance(db, &sqlite3.Config{})
    if err != nil {
        return fmt.Errorf("failed to create migration driver: %w", err)
    }

    m, err := migrate.NewWithDatabaseInstance(
        "file://"+migrationsPath,
        "sqlite3", driver)
    if err != nil {
        return fmt.Errorf("failed to create migration instance: %w", err)
    }

    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
        return fmt.Errorf("failed to apply migrations: %w", err)
    }

    return nil
}
