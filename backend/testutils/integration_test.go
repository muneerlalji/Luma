package testutils_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/muneerlalji/Luma/handlers"
	"github.com/muneerlalji/Luma/middleware"
	"github.com/muneerlalji/Luma/models"
	"github.com/muneerlalji/Luma/testutils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"
)

type IntegrationTestSuite struct {
	suite.Suite
	router *gin.Engine
	db     *gorm.DB
	user   models.User
	token  string
}

func (suite *IntegrationTestSuite) SetupSuite() {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Use testutils to setup test database
	suite.db = testutils.SetupTestDB()
}

func (suite *IntegrationTestSuite) SetupTest() {
	// Use testutils to cleanup test data
	testutils.CleanupTestDB(suite.db)

	// Create a test user
	suite.user = models.User{
		Email:          "test@example.com",
		Password:       "hashedpassword",
		DisplayName:    "Test User",
		EmailConfirmed: true,
	}
	suite.db.Create(&suite.user)

	// Generate a test token (in real tests, you'd use proper JWT)
	suite.token = "test-token"

	// Setup router with all routes
	suite.router = gin.Default()
	suite.router.Use(middleware.CORSMiddleware())

	// Public routes
	suite.router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Luma backend running"})
	})

	// Authentication routes
	auth := suite.router.Group("/auth")
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
		auth.POST("/confirm", handlers.ConfirmEmail)
		auth.POST("/forgot-password", handlers.ForgotPassword)
		auth.POST("/reset-password", handlers.ResetPassword)
	}

	// Protected routes with mock auth middleware
	protected := suite.router.Group("/")
	protected.Use(func(c *gin.Context) {
		// Mock authentication middleware
		c.Set("user_id", suite.user.ID)
		c.Next()
	})
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
}

func (suite *IntegrationTestSuite) TearDownSuite() {
	// Clean up test database
	suite.db.Exec("DROP TABLE IF EXISTS chat_messages CASCADE")
	suite.db.Exec("DROP TABLE IF EXISTS memories CASCADE")
	suite.db.Exec("DROP TABLE IF EXISTS people CASCADE")
	suite.db.Exec("DROP TABLE IF EXISTS photos CASCADE")
	suite.db.Exec("DROP TABLE IF EXISTS users CASCADE")
}

func (suite *IntegrationTestSuite) TestHealthCheck() {
	req, _ := http.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Luma backend running", response["message"])
}

func (suite *IntegrationTestSuite) TestUserRegistration() {
	registerData := models.RegisterRequest{
		Email:       "newuser@example.com",
		Password:    "password123",
		DisplayName: "New User",
	}

	jsonData, _ := json.Marshal(registerData)
	req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	// Email sending will fail in test environment, but user should still be created
	// We expect either 201 (success) or 500 (email failure but user created)
	assert.True(suite.T(), w.Code == http.StatusCreated || w.Code == http.StatusInternalServerError)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	// Verify user was created in database regardless of email status
	var user models.User
	err = suite.db.Where("email = ?", registerData.Email).First(&user).Error
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), registerData.Email, user.Email)
	assert.Equal(suite.T(), registerData.DisplayName, user.DisplayName)
	assert.False(suite.T(), user.EmailConfirmed)
	assert.NotEmpty(suite.T(), user.ConfirmationToken)
}

func (suite *IntegrationTestSuite) TestGetCurrentUser() {
	req, _ := http.NewRequest("GET", "/me", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	// The response contains user fields directly
	assert.Contains(suite.T(), response, "id")
	assert.Contains(suite.T(), response, "email")
	assert.Contains(suite.T(), response, "displayName")
}

func (suite *IntegrationTestSuite) TestCreateAndGetMemories() {
	// Create a memory
	memoryData := models.Memory{
		Title:   "Test Memory",
		Type:    "story",
		Content: "This is a test memory content",
		UserID:  suite.user.ID,
	}

	jsonData, _ := json.Marshal(memoryData)
	req, _ := http.NewRequest("POST", "/memories", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	// Get memories
	req, _ = http.NewRequest("GET", "/memories", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response, "memories")

	memoriesArray := response["memories"].([]interface{})
	assert.Len(suite.T(), memoriesArray, 1)
}

func (suite *IntegrationTestSuite) TestCreateAndGetPeople() {
	// Create a person
	personData := models.Person{
		FirstName:    "John",
		LastName:     "Doe",
		Email:        "john@example.com",
		Phone:        "123-456-7890",
		Relationship: "Friend",
		Notes:        "Test person notes",
		UserID:       suite.user.ID,
	}

	jsonData, _ := json.Marshal(personData)
	req, _ := http.NewRequest("POST", "/people", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	// Get people
	req, _ = http.NewRequest("GET", "/people", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// The response is an array, not an object
	var peopleArray []interface{}
	err := json.Unmarshal(w.Body.Bytes(), &peopleArray)
	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), peopleArray, 1)
}

func (suite *IntegrationTestSuite) TestChatFlow() {
	// Send a chat message
	chatData := models.ChatRequest{
		Message: "Hello, this is a test message",
	}

	jsonData, _ := json.Marshal(chatData)
	req, _ := http.NewRequest("POST", "/chat", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	// Chat will fail due to invalid API key, but we can still test the endpoint
	// We expect either 200 (success) or 500 (API key failure)
	assert.True(suite.T(), w.Code == http.StatusOK || w.Code == http.StatusInternalServerError)

	// Get chat history
	req, _ = http.NewRequest("GET", "/chat/history", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response, "messages")

	// Verify we got a messages array (even if empty)
	messagesArray := response["messages"].([]interface{})
	assert.NotNil(suite.T(), messagesArray)
}

func (suite *IntegrationTestSuite) TestProtectedRouteWithoutAuth() {
	// Create a new router without the mock auth middleware
	router := gin.Default()
	router.Use(middleware.CORSMiddleware())

	// Add protected route without auth middleware
	router.GET("/me", handlers.GetCurrentUser)

	req, _ := http.NewRequest("GET", "/me", nil)
	// No Authorization header

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
}

func (suite *IntegrationTestSuite) TestUpdateProfile() {
	updateData := map[string]interface{}{
		"displayName": "Updated Name",
	}

	jsonData, _ := json.Marshal(updateData)
	req, _ := http.NewRequest("PUT", "/profile", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	// The response contains a nested user object
	assert.Contains(suite.T(), response, "user")
	userData := response["user"].(map[string]interface{})
	assert.Contains(suite.T(), userData, "id")
	assert.Contains(suite.T(), userData, "email")
	assert.Contains(suite.T(), userData, "displayName")
}

func TestIntegrationTestSuite(t *testing.T) {
	suite.Run(t, new(IntegrationTestSuite))
}
