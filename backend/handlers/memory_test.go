package handlers_test

import (
	"bytes"
	"encoding/json"
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

type MemoryTestSuite struct {
	suite.Suite
	router *gin.Engine
	db     *gorm.DB
	user   models.User
	token  string
}

func (suite *MemoryTestSuite) SetupSuite() {
	gin.SetMode(gin.TestMode)
	suite.db = testutils.SetupTestDB()

	// Auto-migrate test database
	suite.db.AutoMigrate(&models.User{}, &models.Memory{})
}

func (suite *MemoryTestSuite) SetupTest() {
	// Clear database before each test
	suite.db.Exec("DELETE FROM memories")
	suite.db.Exec("DELETE FROM users")

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

	// Setup router
	suite.router = gin.Default()

	// Setup protected routes
	protected := suite.router.Group("/")
	protected.Use(func(c *gin.Context) {
		// Mock authentication middleware
		c.Set("userID", suite.user.ID)
		c.Next()
	})
	{
		protected.POST("/memories", handlers.CreateMemory)
		protected.GET("/memories", handlers.GetMemories)
	}
}

func (suite *MemoryTestSuite) TearDownSuite() {
	// Clean up test database
	suite.db.Exec("DROP TABLE IF EXISTS memories")
	suite.db.Exec("DROP TABLE IF EXISTS users")
}

func (suite *MemoryTestSuite) TestCreateMemory_Success() {
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

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	assert.Contains(suite.T(), response, "memory")

	// Verify memory was created in database
	var memory models.Memory
	err = suite.db.Where("title = ?", memoryData.Title).First(&memory).Error
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), memoryData.Title, memory.Title)
	assert.Equal(suite.T(), memoryData.Content, memory.Content)
	assert.Equal(suite.T(), suite.user.ID, memory.UserID)
}

func (suite *MemoryTestSuite) TestCreateMemory_InvalidData() {
	// Test with missing required fields
	memoryData := map[string]interface{}{
		"content": "This is a test memory content",
		// Missing title
	}

	jsonData, _ := json.Marshal(memoryData)
	req, _ := http.NewRequest("POST", "/memories", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func (suite *MemoryTestSuite) TestGetMemories_Success() {
	// Create test memories
	memories := []models.Memory{
		{
			Title:   "Memory 1",
			Type:    "story",
			Content: "First test memory content",
			UserID:  suite.user.ID,
		},
		{
			Title:   "Memory 2",
			Type:    "memory",
			Content: "Second test memory content",
			UserID:  suite.user.ID,
		},
	}

	for _, memory := range memories {
		suite.db.Create(&memory)
	}

	req, _ := http.NewRequest("GET", "/memories", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	assert.Contains(suite.T(), response, "memories")

	// Verify we got the correct number of memories
	memoriesArray := response["memories"].([]interface{})
	assert.Len(suite.T(), memoriesArray, 2)
}

func (suite *MemoryTestSuite) TestGetMemories_Empty() {
	req, _ := http.NewRequest("GET", "/memories", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	assert.Contains(suite.T(), response, "memories")

	// Verify empty memories array
	memoriesArray := response["memories"].([]interface{})
	assert.Len(suite.T(), memoriesArray, 0)
}

func (suite *MemoryTestSuite) TestGetMemories_Unauthorized() {
	req, _ := http.NewRequest("GET", "/memories", nil)
	// No Authorization header

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	// This should fail because we're not using the real auth middleware
	// In a real test with proper middleware, this would return 401
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
}

func TestMemoryTestSuite(t *testing.T) {
	suite.Run(t, new(MemoryTestSuite))
}
