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
	"github.com/muneerlalji/Luma/utils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"
)

type PersonTestSuite struct {
	suite.Suite
	router *gin.Engine
	db     *gorm.DB
	user   models.User
	token  string
}

func (suite *PersonTestSuite) SetupSuite() {
	gin.SetMode(gin.TestMode)
	suite.db = testutils.SetupTestDB()

	// Auto-migrate test database
	suite.db.AutoMigrate(&models.User{}, &models.Person{})
}

func (suite *PersonTestSuite) SetupTest() {
	testutils.CleanupTestDB(suite.db)

	// Create a test user
	suite.user = models.User{
		Email:          "test@example.com",
		Password:       "hashedpassword",
		DisplayName:    "Test User",
		EmailConfirmed: true,
	}
	suite.db.Create(&suite.user)

	token, err := utils.GenerateToken(suite.user.ID, suite.user.Email)
	if err != nil {
		suite.T().Fatalf("Failed to generate test token: %v", err)
	}
	suite.token = token

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
		protected.POST("/people", handlers.CreatePerson)
		protected.GET("/people", handlers.GetPeople)
	}
}

func (suite *PersonTestSuite) TearDownSuite() {
	// Clean up test database using testutils
	testutils.CleanupTestDB(suite.db)
}

func (suite *PersonTestSuite) TestCreatePerson_Success() {
	personData := handlers.CreatePersonRequest{
		FirstName:    "John",
		LastName:     "Doe",
		Email:        "john@example.com",
		Phone:        "123-456-7890",
		Relationship: "Friend",
		Notes:        "Test person notes",
	}

	jsonData, _ := json.Marshal(personData)
	req, _ := http.NewRequest("POST", "/people", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	var response handlers.PersonResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	assert.Equal(suite.T(), personData.FirstName, response.FirstName)
	assert.Equal(suite.T(), personData.LastName, response.LastName)
	assert.Equal(suite.T(), personData.Email, response.Email)

	// Verify person was created in database
	var person models.Person
	err = suite.db.Where("email = ?", personData.Email).First(&person).Error
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), personData.FirstName, person.FirstName)
	assert.Equal(suite.T(), personData.LastName, person.LastName)
	assert.Equal(suite.T(), personData.Email, person.Email)
	assert.Equal(suite.T(), suite.user.ID, person.UserID)
}

func (suite *PersonTestSuite) TestCreatePerson_InvalidData() {
	// Test with missing required fields
	personData := map[string]interface{}{
		"lastName":     "Doe",
		"relationship": "Friend",
	}

	jsonData, _ := json.Marshal(personData)
	req, _ := http.NewRequest("POST", "/people", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func (suite *PersonTestSuite) TestGetPeople_Success() {
	// Create test people
	people := []models.Person{
		{
			FirstName:    "John",
			LastName:     "Doe",
			Email:        "john@example.com",
			Phone:        "123-456-7890",
			Relationship: "Friend",
			Notes:        "Test person 1",
			UserID:       suite.user.ID,
		},
		{
			FirstName:    "Jane",
			LastName:     "Smith",
			Email:        "jane@example.com",
			Phone:        "098-765-4321",
			Relationship: "Family",
			Notes:        "Test person 2",
			UserID:       suite.user.ID,
		},
	}

	for _, person := range people {
		suite.db.Create(&person)
	}

	req, _ := http.NewRequest("GET", "/people", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var responses []handlers.PersonResponse
	err := json.Unmarshal(w.Body.Bytes(), &responses)
	assert.NoError(suite.T(), err)

	// Verify we got the correct number of people
	assert.Len(suite.T(), responses, 2)
}

func (suite *PersonTestSuite) TestGetPeople_Empty() {
	req, _ := http.NewRequest("GET", "/people", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var responses []handlers.PersonResponse
	err := json.Unmarshal(w.Body.Bytes(), &responses)
	assert.NoError(suite.T(), err)

	// Verify empty people array
	assert.Len(suite.T(), responses, 0)
}

func (suite *PersonTestSuite) TestGetPeople_UserIsolation() {
	// Create another user
	otherUser := models.User{
		Email:          "other@example.com",
		Password:       "hashedpassword",
		DisplayName:    "Other User",
		EmailConfirmed: true,
	}
	suite.db.Create(&otherUser)

	// Create people for both users
	person1 := models.Person{
		FirstName:    "John",
		LastName:     "Doe",
		Email:        "john@example.com",
		Phone:        "123-456-7890",
		Relationship: "Friend",
		Notes:        "Test person 1",
		UserID:       suite.user.ID,
	}
	person2 := models.Person{
		FirstName:    "Jane",
		LastName:     "Smith",
		Email:        "jane@example.com",
		Phone:        "098-765-4321",
		Relationship: "Family",
		Notes:        "Test person 2",
		UserID:       otherUser.ID,
	}

	suite.db.Create(&person1)
	suite.db.Create(&person2)

	// Get people for the first user
	req, _ := http.NewRequest("GET", "/people", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var responses []handlers.PersonResponse
	err := json.Unmarshal(w.Body.Bytes(), &responses)
	assert.NoError(suite.T(), err)

	// Verify only the first user's people are returned
	assert.Len(suite.T(), responses, 1)
}

func TestPersonTestSuite(t *testing.T) {
	suite.Run(t, new(PersonTestSuite))
}
