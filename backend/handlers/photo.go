package handlers

import (
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/muneerlalji/Luma/db"
	"github.com/muneerlalji/Luma/models"
)

// GetPhoto serves a photo from S3 with authentication
func GetPhoto(c *gin.Context) {
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

	photoID := c.Param("id")
	if photoID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Photo ID is required"})
		return
	}

	photoUUID, err := uuid.Parse(photoID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid photo ID format"})
		return
	}

	var photo models.Photo
	if err := db.DB.Where("id = ? AND user_id = ?", photoUUID, userUUID).First(&photo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Photo not found or not owned by user"})
		return
	}

	cfg, err := config.LoadDefaultConfig(c, config.WithRegion(os.Getenv("AWS_REGION")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AWS config error"})
		return
	}

	s3Client := s3.NewFromConfig(cfg)
	bucket := os.Getenv("S3_BUCKET")

	presignClient := s3.NewPresignClient(s3Client)
	presignedURL, err := presignClient.PresignGetObject(c, &s3.GetObjectInput{
		Bucket: &bucket,
		Key:    &photo.S3Key,
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Hour
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate photo URL"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url":        presignedURL.URL,
		"filename":   photo.Filename,
		"filetype":   photo.Filetype,
		"uploadedAt": photo.UploadedAt,
	})
}