package testutils

import (
	"os"

	"github.com/muneerlalji/Luma/db"
	"github.com/muneerlalji/Luma/models"
	"gorm.io/gorm"
)

// SetupTestEnvironment sets up all necessary environment variables for testing
func SetupTestEnvironment() {
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing-only")
	os.Setenv("FRONTEND_URL", "http://localhost:3000")
	os.Setenv("CLAUDE_API_KEY", "sk-ant-api03-1234567890")
	os.Setenv("POSTGRES_DSN", "postgres://test_user:test_password@localhost:5432/luma_test")
	os.Setenv("AWS_ACCESS_KEY_ID", "test_access_key_id")
	os.Setenv("AWS_SECRET_ACCESS_KEY", "test_secret_access_key")
	os.Setenv("AWS_REGION", "test-region")
	os.Setenv("S3_BUCKET", "test-bucket-name")
	os.Setenv("PORT", "8080")
	os.Setenv("SMTP_HOST", "smtp.gmail.com")
	os.Setenv("SMTP_PORT", "587")
	os.Setenv("SMTP_USER", "test@example.com")
	os.Setenv("SMTP_PASS", "test_password")
	os.Setenv("SMTP_FROM", "test@example.com")
}

// SetupTestDB initializes the test database and returns the database connection
func SetupTestDB() *gorm.DB {
	SetupTestEnvironment()

	// Initialize database
	db.Init()

	// Auto-migrate all models
	db.DB.AutoMigrate(
		&models.User{},
		&models.Memory{},
		&models.Person{},
		&models.ChatMessage{},
		&models.Photo{},
	)

	return db.DB
}

// CleanupTestDB cleans up test data
func CleanupTestDB(db *gorm.DB) {
	db.Exec("DELETE FROM chat_messages")
	db.Exec("DELETE FROM memories")
	db.Exec("DELETE FROM people")
	db.Exec("DELETE FROM photos")
	db.Exec("DELETE FROM users")
}
