package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/muneerlalji/Luma/db"
	"github.com/muneerlalji/Luma/models"
)

type CreatePersonRequest struct {
	FirstName    string     `json:"firstName" binding:"required"`
	LastName     string     `json:"lastName" binding:"required"`
	Email        string     `json:"email" binding:"required,email"`
	Phone        string     `json:"phone" binding:"required"`
	Relationship string     `json:"relationship" binding:"required"`
	Notes        string     `json:"notes"`
	PhotoID      *uuid.UUID `json:"photoId,omitempty"`
}

type PersonResponse struct {
	ID           uuid.UUID  `json:"id"`
	FirstName    string     `json:"firstName"`
	LastName     string     `json:"lastName"`
	Email        string     `json:"email"`
	Phone        string     `json:"phone"`
	Relationship string     `json:"relationship"`
	Notes        string     `json:"notes"`
	PhotoID      *uuid.UUID `json:"photoId,omitempty"`
	PhotoURL     *string    `json:"photoUrl,omitempty"`
}

func CreatePerson(c *gin.Context) {
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

	var req CreatePersonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate photo ownership if provided
	if req.PhotoID != nil {
		var photo models.Photo
		if err := db.DB.Where("id = ? AND user_id = ?", req.PhotoID, userUUID).First(&photo).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Photo not found or not owned by user"})
			return
		}
	}

	person := models.Person{
		UserID:       userUUID,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Email:        req.Email,
		Phone:        req.Phone,
		Relationship: req.Relationship,
		Notes:        req.Notes,
		PhotoID:      req.PhotoID,
	}

	if err := db.DB.Create(&person).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create person"})
		return
	}

	response := PersonResponse{
		ID:           person.ID,
		FirstName:    person.FirstName,
		LastName:     person.LastName,
		Email:        person.Email,
		Phone:        person.Phone,
		Relationship: person.Relationship,
		Notes:        person.Notes,
		PhotoID:      person.PhotoID,
	}

	c.JSON(http.StatusCreated, response)
}

func GetPeople(c *gin.Context) {
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

	var people []models.Person
	if err := db.DB.Preload("Photo").Where("user_id = ?", userUUID).Find(&people).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get people"})
		return
	}

	var responses []PersonResponse
	for _, person := range people {
		response := PersonResponse{
			ID:           person.ID,
			FirstName:    person.FirstName,
			LastName:     person.LastName,
			Email:        person.Email,
			Phone:        person.Phone,
			Relationship: person.Relationship,
			Notes:        person.Notes,
			PhotoID:      person.PhotoID,
		}
		responses = append(responses, response)
	}

	c.JSON(http.StatusOK, responses)
}
