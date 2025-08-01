package handlers

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/muneerlalji/Luma/db"
	"github.com/muneerlalji/Luma/models"
)

// CreateMemoryRequest represents the request payload for creating a memory
type CreateMemoryRequest struct {
	Title     string      `json:"title" binding:"required"`
	Type      string      `json:"type" binding:"required"`
	Content   string      `json:"content" binding:"required"`
	PhotoID   *uuid.UUID  `json:"photoId,omitempty"`
	PeopleIDs []uuid.UUID `json:"peopleIds,omitempty"`
}

// MemoryResponse represents the memory data sent to the client
type MemoryResponse struct {
	ID        uuid.UUID        `json:"id"`
	Title     string           `json:"title"`
	Type      string           `json:"type"`
	Content   string           `json:"content"`
	PhotoID   *uuid.UUID       `json:"photoId,omitempty"`
	PhotoURL  *string          `json:"photoUrl,omitempty"`
	People    []PersonResponse `json:"people,omitempty"`
	CreatedAt string           `json:"createdAt"`
}

// CreateMemory handles memory creation for authenticated users
func CreateMemory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req CreateMemoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userUUID, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	memory := models.Memory{
		UserID:  userUUID,
		Title:   req.Title,
		Type:    req.Type,
		Content: req.Content,
	}

	if err := db.DB.Create(&memory).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create memory"})
		return
	}

	if req.PhotoID != nil {
		var photo models.Photo
		if err := db.DB.Where("id = ? AND user_id = ?", req.PhotoID, userUUID).First(&photo).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Photo not found or not owned by user"})
			return
		}

		photo.MemoryID = &memory.ID
		if err := db.DB.Save(&photo).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to associate photo with memory"})
			return
		}
	}

	// Associate people with memory if provided
	if len(req.PeopleIDs) > 0 {
		var people []models.Person
		if err := db.DB.Where("id IN ? AND user_id = ?", req.PeopleIDs, userUUID).Find(&people).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "One or more people not found or not owned by user"})
			return
		}

		if err := db.DB.Model(&memory).Association("People").Append(people); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to associate people with memory"})
			return
		}
	}

	response := MemoryResponse{
		ID:        memory.ID,
		Title:     memory.Title,
		Type:      memory.Type,
		Content:   memory.Content,
		PhotoID:   req.PhotoID,
		CreatedAt: memory.CreatedAt.Format(time.RFC3339),
	}

	c.JSON(http.StatusCreated, gin.H{"memory": response})
}

// GetMemories returns all memories for the authenticated user
func GetMemories(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userUUID, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	var memories []models.Memory
	if err := db.DB.Preload("People").Where("user_id = ?", userUUID).Order("created_at DESC").Find(&memories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch memories"})
		return
	}

	responses := make([]MemoryResponse, 0)

	for _, memory := range memories {
		// Get associated photo if any
		var photo models.Photo
		var photoID *uuid.UUID
		var photoURL *string
		if err := db.DB.Where("memory_id = ?", memory.ID).First(&photo).Error; err == nil {
			photoID = &photo.ID
			// Generate photo URL
			url := fmt.Sprintf("%s/photos/%s", os.Getenv("API_BASE_URL"), photo.ID.String())
			photoURL = &url
		}

		// Convert people to PersonResponse
		var personResponses []PersonResponse
		for _, person := range memory.People {
			personResponses = append(personResponses, PersonResponse{
				ID:           person.ID,
				FirstName:    person.FirstName,
				LastName:     person.LastName,
				Email:        person.Email,
				Phone:        person.Phone,
				Relationship: person.Relationship,
				Notes:        person.Notes,
				PhotoID:      person.PhotoID,
			})
		}

		response := MemoryResponse{
			ID:        memory.ID,
			Title:     memory.Title,
			Type:      memory.Type,
			Content:   memory.Content,
			PhotoID:   photoID,
			PhotoURL:  photoURL,
			People:    personResponses,
			CreatedAt: memory.CreatedAt.Format(time.RFC3339),
		}
		responses = append(responses, response)
	}

	c.JSON(http.StatusOK, gin.H{"memories": responses})
}
