package handlers_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/muneerlalji/Luma/handlers"
	"github.com/muneerlalji/Luma/models"
	"github.com/muneerlalji/Luma/testutils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"
)

type ChatTestSuite struct {
	suite.Suite
	router        *gin.Engine
	db            *gorm.DB
	user          models.User
	token         string
	anthropicMock *testutils.AnthropicMock
}

func (suite *ChatTestSuite) SetupSuite() {
	gin.SetMode(gin.TestMode)

	// Setup Anthropic mock
	suite.anthropicMock = testutils.SetupAnthropicMock()

	// Setup test database with Anthropic mock URL
	suite.db = testutils.SetupTestDBWithAnthropicMock(suite.anthropicMock.GetBaseURL())

	// Auto-migrate test database
	suite.db.AutoMigrate(&models.User{}, &models.ChatMessage{})
}

func (suite *ChatTestSuite) SetupTest() {
	// Clear database before each test
	testutils.CleanupTestDB(suite.db)

	// Clear Anthropic mock requests
	suite.anthropicMock.ClearRequests()

	// Create a test user
	suite.user = models.User{
		Email:          "test@example.com",
		Password:       "hashedpassword",
		DisplayName:    "Test User",
		EmailConfirmed: true,
	}
	suite.db.Create(&suite.user)

	// Generate a test token
	suite.token = "test-token"

	// Setup router
	suite.router = gin.Default()

	// Setup protected routes
	protected := suite.router.Group("/")
	protected.Use(func(c *gin.Context) {
		// Mock authentication middleware - use "user_id" key to match handler expectation
		c.Set("user_id", suite.user.ID)
		c.Next()
	})
	{
		protected.POST("/chat", handlers.Chat)
		protected.GET("/chat/history", handlers.GetChatHistory)
	}
}

func (suite *ChatTestSuite) TearDownSuite() {
	// Clean up test database
	suite.db.Exec("DROP TABLE IF EXISTS chat_messages CASCADE")
	suite.db.Exec("DROP TABLE IF EXISTS users CASCADE")

	// Close Anthropic mock
	suite.anthropicMock.Close()
}

func (suite *ChatTestSuite) TestChat_Success() {
	chatData := models.ChatRequest{
		Message: "Hello, this is a test message",
	}

	jsonData, _ := json.Marshal(chatData)
	req, _ := http.NewRequest("POST", "/chat", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	assert.Contains(suite.T(), response, "message")

	// Verify chat message was created in database
	var chat models.ChatMessage
	err = suite.db.Where("content = ?", chatData.Message).First(&chat).Error
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), chatData.Message, chat.Content)
	assert.Equal(suite.T(), "user", chat.Role)
	assert.Equal(suite.T(), suite.user.ID, chat.UserID)
}

func (suite *ChatTestSuite) TestChat_EmptyMessage() {
	chatData := models.ChatRequest{
		Message: "",
	}

	jsonData, _ := json.Marshal(chatData)
	req, _ := http.NewRequest("POST", "/chat", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func (suite *ChatTestSuite) TestGetChatHistory_Success() {
	// Create test chat messages
	chats := []models.ChatMessage{
		{
			Role:    "user",
			Content: "First message",
			UserID:  suite.user.ID,
		},
		{
			Role:    "assistant",
			Content: "Second message",
			UserID:  suite.user.ID,
		},
		{
			Role:    "user",
			Content: "Third message",
			UserID:  suite.user.ID,
		},
	}

	for _, chat := range chats {
		suite.db.Create(&chat)
	}

	req, _ := http.NewRequest("GET", "/chat/history", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	assert.Contains(suite.T(), response, "messages")

	// Verify we got the correct number of chat messages
	chatsArray := response["messages"].([]interface{})
	assert.Len(suite.T(), chatsArray, 3)
}

func (suite *ChatTestSuite) TestGetChatHistory_Empty() {
	req, _ := http.NewRequest("GET", "/chat/history", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	assert.Contains(suite.T(), response, "messages")

	// Verify empty chats array
	chatsArray := response["messages"].([]interface{})
	assert.Len(suite.T(), chatsArray, 0)
}

func (suite *ChatTestSuite) TestGetChatHistory_UserIsolation() {
	// Create another user
	otherUser := models.User{
		Email:          "other@example.com",
		Password:       "hashedpassword",
		DisplayName:    "Other User",
		EmailConfirmed: true,
	}
	suite.db.Create(&otherUser)

	// Create chat messages for both users
	chat1 := models.ChatMessage{
		Role:    "user",
		Content: "Message from user 1",
		UserID:  suite.user.ID,
	}
	chat2 := models.ChatMessage{
		Role:    "user",
		Content: "Message from user 2",
		UserID:  otherUser.ID,
	}

	suite.db.Create(&chat1)
	suite.db.Create(&chat2)

	// Get chat history for the first user
	req, _ := http.NewRequest("GET", "/chat/history", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	// Verify only the first user's chat messages are returned
	chatsArray := response["messages"].([]interface{})
	assert.Len(suite.T(), chatsArray, 1)
}

func (suite *ChatTestSuite) TestGetChatHistory_Limit() {
	// Create many test chat messages
	for i := 0; i < 25; i++ {
		chat := models.ChatMessage{
			Role:    "user",
			Content: fmt.Sprintf("Message %d", i),
			UserID:  suite.user.ID,
		}
		suite.db.Create(&chat)
	}

	req, _ := http.NewRequest("GET", "/chat/history?limit=10", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	// Verify we got the limited number of chat messages
	chatsArray := response["messages"].([]interface{})
	assert.Len(suite.T(), chatsArray, 10)
}

func TestChatTestSuite(t *testing.T) {
	suite.Run(t, new(ChatTestSuite))
}
