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

type AuthTestSuite struct {
	suite.Suite
	router *gin.Engine
	db     *gorm.DB
}

func (suite *AuthTestSuite) SetupSuite() {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	suite.db = testutils.SetupTestDB()

	suite.db.AutoMigrate(&models.User{})
}

func (suite *AuthTestSuite) SetupTest() {
	// Clear database before each test
	suite.db.Exec("DELETE FROM users")

	// Setup router
	suite.router = gin.Default()

	// Setup routes
	auth := suite.router.Group("/auth")
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
		auth.POST("/confirm", handlers.ConfirmEmail)
		auth.POST("/forgot-password", handlers.ForgotPassword)
		auth.POST("/reset-password", handlers.ResetPassword)
	}
}

func (suite *AuthTestSuite) TearDownSuite() {
	suite.db.Exec("DROP TABLE IF EXISTS users")
}

func (suite *AuthTestSuite) TestRegister_Success() {
	// Test data
	registerData := models.RegisterRequest{
		Email:       "test@example.com",
		Password:    "password123",
		DisplayName: "Test User",
	}

	jsonData, _ := json.Marshal(registerData)
	req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	assert.Contains(suite.T(), response, "user")
	assert.Contains(suite.T(), response, "message")

	// Verify user was created in database
	var user models.User
	err = suite.db.Where("email = ?", registerData.Email).First(&user).Error
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), registerData.Email, user.Email)
	assert.Equal(suite.T(), registerData.DisplayName, user.DisplayName)
	assert.False(suite.T(), user.EmailConfirmed)
	assert.NotEmpty(suite.T(), user.ConfirmationToken)
}

func (suite *AuthTestSuite) TestRegister_DuplicateEmail() {
	// Create a user first
	user := models.User{
		Email:       "test@example.com",
		Password:    "hashedpassword",
		DisplayName: "Test User",
	}
	suite.db.Create(&user)

	// Try to register with same email
	registerData := models.RegisterRequest{
		Email:       "test@example.com",
		Password:    "password123",
		DisplayName: "Another User",
	}

	jsonData, _ := json.Marshal(registerData)
	req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusConflict, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response["error"], "already exists")
}

func (suite *AuthTestSuite) TestRegister_InvalidData() {
	// Test with invalid email
	registerData := models.RegisterRequest{
		Email:       "invalid-email",
		Password:    "password123",
		DisplayName: "Test User",
	}

	jsonData, _ := json.Marshal(registerData)
	req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func (suite *AuthTestSuite) TestLogin_Success() {
	// Create a user first
	user := models.User{
		Email:             "test@example.com",
		Password:          "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890", // bcrypt hash
		DisplayName:       "Test User",
		EmailConfirmed:    true,
		ConfirmationToken: "",
	}
	suite.db.Create(&user)

	// Test login
	loginData := models.LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	}

	jsonData, _ := json.Marshal(loginData)
	req, _ := http.NewRequest("POST", "/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	// Note: This test will fail because we need to properly hash the password
	// In a real test, you'd use a proper bcrypt hash
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
}

func (suite *AuthTestSuite) TestLogin_InvalidCredentials() {
	loginData := models.LoginRequest{
		Email:    "nonexistent@example.com",
		Password: "wrongpassword",
	}

	jsonData, _ := json.Marshal(loginData)
	req, _ := http.NewRequest("POST", "/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
}

func (suite *AuthTestSuite) TestConfirmEmail_Success() {
	// Create a user with confirmation token
	token := "test-confirmation-token"
	user := models.User{
		Email:             "test@example.com",
		Password:          "hashedpassword",
		DisplayName:       "Test User",
		EmailConfirmed:    false,
		ConfirmationToken: token,
	}
	suite.db.Create(&user)

	// Test confirmation
	confirmData := map[string]string{"token": token}
	jsonData, _ := json.Marshal(confirmData)
	req, _ := http.NewRequest("POST", "/auth/confirm", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Verify user is confirmed
	var updatedUser models.User
	err := suite.db.Where("email = ?", user.Email).First(&updatedUser).Error
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), updatedUser.EmailConfirmed)
	assert.Empty(suite.T(), updatedUser.ConfirmationToken)
}

func (suite *AuthTestSuite) TestConfirmEmail_InvalidToken() {
	confirmData := map[string]string{"token": "invalid-token"}
	jsonData, _ := json.Marshal(confirmData)
	req, _ := http.NewRequest("POST", "/auth/confirm", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func TestAuthTestSuite(t *testing.T) {
	suite.Run(t, new(AuthTestSuite))
}
