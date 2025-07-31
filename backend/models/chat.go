package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ChatMessage struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Role      string    `gorm:"not null" json:"role"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

// MarshalJSON customizes the JSON serialization to format dates properly
func (cm ChatMessage) MarshalJSON() ([]byte, error) {
	type Alias ChatMessage
	return json.Marshal(&struct {
		*Alias
		CreatedAt string `json:"createdAt"`
	}{
		Alias:     (*Alias)(&cm),
		CreatedAt: cm.CreatedAt.Format(time.RFC3339),
	})
}

// ChatRequest represents the chat request payload
type ChatRequest struct {
	Message string `json:"message" binding:"required"`
}

// ChatResponse represents the chat response payload
type ChatResponse struct {
	Message string `json:"message"`
}
