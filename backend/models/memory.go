package models

import (
	"time"

	"github.com/google/uuid"
)

type Memory struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;not null"`
	User      User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Title     string    `gorm:"not null"`
	Type      string    `gorm:"not null"`
	Content   string    `gorm:"type:text;not null"`
	People    []Person  `gorm:"many2many:memory_people;"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}
