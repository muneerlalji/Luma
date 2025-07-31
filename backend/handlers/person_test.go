package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/muneerlalji/Luma/db"
	"github.com/muneerlalji/Luma/handlers"
	"github.com/muneerlalji/Luma/models"
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
	suite.db = db.DB

	// Auto-migrate test database
	suite.db.AutoMigrate(&models.User{}, &models.Person{})
}

func (suite *PersonTestSuite) SetupTest() {
	// Clear database before each test
	suite.db.Exec("DELETE FROM people")
	suite.db.Exec("DELETE FROM users")

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
		// Mock authentication middleware
		c.Set("userID", suite.user.ID)
		c.Next()
	})
	{
		protected.POST("/people", handlers.CreatePerson)
		protected.GET("/people", handlers.GetPeople)
	}
}

func (suite *PersonTestSuite) TearDownSuite() {
	// Clean up test database
	suite.db.Exec("DROP TABLE IF EXISTS people")
	suite.db.Exec("DROP TABLE IF EXISTS users")
}

func (suite *PersonTestSuite) TestCreatePerson_Success() {
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

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	assert.Contains(suite.T(), response, "person")

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
		// Missing firstName and email
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

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	assert.Contains(suite.T(), response, "people")

	// Verify we got the correct number of people
	peopleArray := response["people"].([]interface{})
	assert.Len(suite.T(), peopleArray, 2)
}

func (suite *PersonTestSuite) TestGetPeople_Empty() {
	req, _ := http.NewRequest("GET", "/people", nil)
	req.Header.Set("Authorization", "Bearer "+suite.token)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	assert.Contains(suite.T(), response, "people")

	// Verify empty people array
	peopleArray := response["people"].([]interface{})
	assert.Len(suite.T(), peopleArray, 0)
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

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	// Verify only the first user's people are returned
	peopleArray := response["people"].([]interface{})
	assert.Len(suite.T(), peopleArray, 1)
}

func TestPersonTestSuite(t *testing.T) {
	suite.Run(t, new(PersonTestSuite))
}
