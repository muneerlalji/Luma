package models

import (
	"time"

	"github.com/google/uuid"
)

type Person struct {
	ID           uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID       uuid.UUID  `gorm:"type:uuid;not null"`
	FirstName    string     `gorm:"not null"`
	LastName     string     `gorm:"not null"`
	Email        string     `gorm:"not null"`
	Phone        string     `gorm:"not null"`
	Relationship string     `gorm:"not null"`
	Notes        string     `gorm:"not null"`
	PhotoID      *uuid.UUID `gorm:"type:uuid"`
	Photo        *Photo     `gorm:"foreignKey:PhotoID"`
	CreatedAt    time.Time  `gorm:"autoCreateTime"`
	UpdatedAt    time.Time  `gorm:"autoUpdateTime"`
}
