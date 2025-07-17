package handlers

import (
	"net/http"
	"os"
	"path/filepath"

	"fmt"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/muneerlalji/Luma/db"
	"github.com/muneerlalji/Luma/models"
)

func UploadPhoto(c *gin.Context) {
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

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer file.Close()

	ext := filepath.Ext(fileHeader.Filename)
	filename := uuid.New().String() + ext
	bucket := os.Getenv("S3_BUCKET")
	key := "photos/" + filename

	cfg, err := config.LoadDefaultConfig(c, config.WithRegion(os.Getenv("AWS_REGION")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AWS config error"})
		return
	}

	s3Client := s3.NewFromConfig(cfg)

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	_, err = s3Client.PutObject(c, &s3.PutObjectInput{
		Bucket:      &bucket,
		Key:         &key,
		Body:        file,
		ContentType: &contentType,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to upload to S3: %v", err)})
		return
	}

	photo := models.Photo{
		ID:       uuid.New(),
		UserID:   userUUID,
		S3Key:    key,
		Filename: fileHeader.Filename,
		Filetype: contentType,
	}

	if err := db.DB.Create(&photo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save photo metadata"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":      photo.ID,
		"key":     key,
		"message": "Photo uploaded successfully",
	})
}
