package models

import (
	"time"

	"github.com/google/uuid"
)

type Photo struct {
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID     uuid.UUID `gorm:"type:uuid;not null"`
	User       User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	MemoryID   *uuid.UUID
	Memory     *Memory
	S3Key      string `gorm:"not null"`
	Filename   string
	Filetype   string
	UploadedAt time.Time `gorm:"autoCreateTime"`
}
