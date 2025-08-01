package db

import (
	"fmt"
	"log"
	"os"

	"github.com/muneerlalji/Luma/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

// Initialize the database connection
func Init() {
	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		log.Fatal("Missing POSTGRES_DSN environment variable")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	db.Exec("DROP TABLE IF EXISTS chat_messages CASCADE")
	db.Exec("DROP TABLE IF EXISTS memory_people CASCADE")
	db.Exec("DROP TABLE IF EXISTS memories CASCADE")
	db.Exec("DROP TABLE IF EXISTS people CASCADE")
	db.Exec("DROP TABLE IF EXISTS photos CASCADE")
	db.Exec("DROP TABLE IF EXISTS users CASCADE")

	// Migrate tables in dependency order
	err = db.AutoMigrate(
		&models.User{},
		&models.Photo{},
		&models.Person{},
		&models.Memory{},
		&models.ChatMessage{},
	)
	if err != nil {
		log.Fatal("AutoMigrate error:", err)
	}

	fmt.Println("Connected to PostgreSQL & migrated schema")
	DB = db
}
