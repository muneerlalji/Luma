package handlers

import (
	"net/http"
	"os"

	"fmt"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
)

func UploadPhoto(c *gin.Context) {
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

	bucket := os.Getenv("S3_BUCKET")
	key := "photos/" + fileHeader.Filename

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

	c.JSON(http.StatusOK, gin.H{"key": key, "message": "Photo uploaded successfully"})
}
