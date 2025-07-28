package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/muneerlalji/Luma/db"
	"github.com/muneerlalji/Luma/handlers"
	"github.com/muneerlalji/Luma/middleware"
)

func init() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
}

func main() {
	db.Init()

	router := gin.Default()
	router.Use(middleware.CORSMiddleware())

	// Public routes
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Luma backend running"})
	})

	// Authentication routes
	auth := router.Group("/auth")
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
		auth.POST("/confirm", handlers.ConfirmEmail)
		auth.POST("/forgot-password", handlers.ForgotPassword)
		auth.POST("/reset-password", handlers.ResetPassword)
	}

	// Protected routes
	protected := router.Group("/")
	protected.Use(handlers.AuthMiddleware())
	{
		protected.GET("/me", handlers.GetCurrentUser)
		protected.PUT("/profile", handlers.UpdateProfile)
		protected.PUT("/change-password", handlers.ChangePassword)
		protected.DELETE("/profile", handlers.DeleteAccount)
		protected.POST("/upload-photo", handlers.UploadPhoto)
		protected.POST("/memories", handlers.CreateMemory)
		protected.GET("/memories", handlers.GetMemories)
		protected.GET("/photos/:id", handlers.GetPhoto)
		protected.POST("/people", handlers.CreatePerson)
		protected.GET("/people", handlers.GetPeople)
		protected.POST("/chat", handlers.Chat)
		protected.GET("/chat/history", handlers.GetChatHistory)
	}

	port := os.Getenv("PORT")
	if port == "" {
		log.Fatal("PORT is not set")
	}

	router.Run(":" + port)
}
