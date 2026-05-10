package sqlite

import (
	"database/sql"
	"testing"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/mattn/go-sqlite3"
)

func TestMigrationsUpAndDown(t *testing.T) {
	db, err := sql.Open("sqlite3", t.TempDir()+"/migration-test.db")
	if err != nil {
		t.Fatalf("open temp db: %v", err)
	}
	defer db.Close()

	driver, err := sqlite3.WithInstance(db, &sqlite3.Config{})
	if err != nil {
		t.Fatalf("create migration driver: %v", err)
	}

	m, err := migrate.NewWithDatabaseInstance("file://../migrations/sqlite", "sqlite3", driver)
	if err != nil {
		t.Fatalf("create migration instance: %v", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("migration up: %v", err)
	}
	if _, err := db.Exec(`SELECT id, email FROM users LIMIT 1`); err != nil {
		t.Fatalf("users table missing after up migrations: %v", err)
	}

	if err := m.Down(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("migration down: %v", err)
	}
	if _, err := db.Exec(`SELECT id FROM users LIMIT 1`); err == nil {
		t.Fatalf("users table still exists after down migrations")
	}
}
