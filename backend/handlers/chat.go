package handlers

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/muneerlalji/Luma/db"
	"github.com/muneerlalji/Luma/models"
)

// Claude API request/response structures
type ClaudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ClaudeRequest struct {
	Model       string          `json:"model"`
	MaxTokens   int             `json:"max_tokens"`
	Messages    []ClaudeMessage `json:"messages"`
	Temperature float64         `json:"temperature"`
	Stream      bool            `json:"stream"`
}

type ClaudeResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
}

type ClaudeStreamingResponse struct {
	Type  string `json:"type"`
	Index int    `json:"index"`
	Delta struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"delta"`
}

// Chat handles chat requests and provides AI-powered responses
func Chat(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req models.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Printf("Error binding JSON: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user's memories and people for context
	memories, people, err := getUserContext(userID.(uuid.UUID))
	if err != nil {
		fmt.Printf("Error getting user context: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user context"})
		return
	}

	// Check if streaming is requested
	if c.Query("stream") == "true" {
		// Set headers for Server-Sent Events
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Headers", "Cache-Control")

		// Handle streaming chat
		if err := generateStreamingAIResponse(c, userID.(uuid.UUID), req.Message, memories, people); err != nil {
			fmt.Printf("Streaming chat error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Streaming failed"})
		}
		return
	}

	// Generate AI response (non-streaming)
	response, err := generateAIResponse(req.Message, memories, people)
	if err != nil {
		fmt.Printf("Error generating AI response: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate response"})
		return
	}

	// Save both user message and AI response to database
	if err := saveChatMessages(userID.(uuid.UUID), req.Message, response); err != nil {
		fmt.Printf("Error saving chat messages: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save chat messages"})
		return
	}

	c.JSON(http.StatusOK, models.ChatResponse{Message: response})
}

// GetChatHistory retrieves the user's chat history
func GetChatHistory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get limit from query parameter, default to no limit
	limitStr := c.Query("limit")
	var limit int
	if limitStr != "" {
		if _, err := fmt.Sscanf(limitStr, "%d", &limit); err != nil || limit <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid limit parameter"})
			return
		}
	}

	var messages []models.ChatMessage
	query := db.DB.Where("user_id = ?", userID).Order("created_at asc")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve chat history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

// getUserContext retrieves user's memories and people for AI context
func getUserContext(userID uuid.UUID) ([]models.Memory, []models.Person, error) {
	var memories []models.Memory
	var people []models.Person

	// Get memories with people relationships
	if err := db.DB.Preload("People").Where("user_id = ?", userID).Find(&memories).Error; err != nil {
		return nil, nil, err
	}

	// Get people
	if err := db.DB.Where("user_id = ?", userID).Find(&people).Error; err != nil {
		return nil, nil, err
	}

	return memories, people, nil
}

// generateAIResponse creates a response using Claude API with user context
func generateAIResponse(userMessage string, memories []models.Memory, people []models.Person) (string, error) {
	apiKey := os.Getenv("CLAUDE_API_KEY")
	if apiKey == "" {
		fmt.Printf("CLAUDE_API_KEY is not set\n")
		return "I'm sorry, but I'm not configured to respond right now. Please contact support.", nil
	}

	apiURL := os.Getenv("ANTHROPIC_API_URL")
	if apiURL == "" {
		fmt.Printf("ANTHROPIC_API_URL is not set\n")
		return "I'm sorry, but I'm not configured to respond right now. Please contact support.", nil
	}

	// Build context from user's data
	context := buildContext(memories, people)

	// Create system prompt
	systemPrompt := `You are a compassionate AI assistant designed to help people with memory loss and dementia. 
Your role is to help them remember important information about their life, people, and events.

IMPORTANT GUIDELINES:
- Be patient, kind, and understanding
- Use simple, clear language
- If you don't have information about something, say so gently
- Focus on positive memories and helpful information
- Be encouraging and supportive
- If someone seems confused, help clarify gently
- Always be respectful and dignified

User's Personal Information:
` + context

	// Prepare Claude API request
	claudeReq := ClaudeRequest{
		Model:       "claude-3-5-sonnet-20241022",
		MaxTokens:   1000,
		Temperature: 0.7,
		Messages: []ClaudeMessage{
			{Role: "user", Content: systemPrompt + "\n\nUser: " + userMessage},
		},
		Stream: false,
	}

	// Make API request
	jsonData, err := json.Marshal(claudeReq)
	if err != nil {
		fmt.Printf("Error marshaling request: %v\n", err)
		return "", err
	}

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error making HTTP request: %v\n", err)
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading response body: %v\n", err)
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("Claude API request failed with status %d: %s\n", resp.StatusCode, string(body))
		return "", fmt.Errorf("API request failed: %s", string(body))
	}

	var claudeResp ClaudeResponse
	if err := json.Unmarshal(body, &claudeResp); err != nil {
		fmt.Printf("Error unmarshaling response: %v\n", err)
		return "", err
	}

	return claudeResp.Content[0].Text, nil
}

// generateStreamingAIResponse handles streaming responses from Claude API
func generateStreamingAIResponse(c *gin.Context, userID uuid.UUID, userMessage string, memories []models.Memory, people []models.Person) error {
	apiKey := os.Getenv("CLAUDE_API_KEY")
	if apiKey == "" {
		fmt.Printf("CLAUDE_API_KEY is not set for streaming\n")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Streaming not configured"})
		return fmt.Errorf("streaming not configured")
	}

	apiURL := os.Getenv("ANTHROPIC_API_URL")
	if apiURL == "" {
		fmt.Printf("ANTHROPIC_API_URL is not set for streaming\n")
		return fmt.Errorf("streaming not configured")
	}

	// Build context for streaming
	context := buildContext(memories, people)

	// Create system prompt for streaming
	systemPrompt := `You are a compassionate AI assistant designed to help people with memory loss and dementia. 
Your role is to help them remember important information about their life, people, and events.

IMPORTANT GUIDELINES:
- Be patient, kind, and understanding
- Use simple, clear language
- If you don't have information about something, say so gently
- Focus on positive memories and helpful information
- Be encouraging and supportive
- If someone seems confused, help clarify gently
- Always be respectful and dignified

User's Personal Information:
` + context

	// Prepare Claude API request for streaming
	claudeReq := ClaudeRequest{
		Model:       "claude-3-5-sonnet-20241022",
		MaxTokens:   2000,
		Temperature: 0.7,
		Messages: []ClaudeMessage{
			{Role: "user", Content: systemPrompt + "\n\nUser: " + userMessage},
		},
		Stream: true,
	}

	// Make API request
	jsonData, err := json.Marshal(claudeReq)
	if err != nil {
		fmt.Printf("Error marshaling streaming request: %v\n", err)
		return err
	}

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("Error creating streaming request: %v\n", err)
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error making HTTP streaming request: %v\n", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("Claude API streaming request failed with status %d: %s\n", resp.StatusCode, string(body))
		return fmt.Errorf("API streaming request failed: %s", string(body))
	}

	// Read and stream the response
	scanner := bufio.NewScanner(resp.Body)
	buf := make([]byte, 0, 1024*1024)
	scanner.Buffer(buf, 1024*1024)

	var fullResponse strings.Builder

	for scanner.Scan() {
		line := scanner.Text()
		// Handle Server-Sent Events format
		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")

			// Check for end of stream
			if data == "[DONE]" {
				break
			}

			// Parse JSON data
			var claudeStreamResp ClaudeStreamingResponse
			if err := json.Unmarshal([]byte(data), &claudeStreamResp); err != nil {
				fmt.Printf("Error parsing streaming data: %v, data: %s\n", err, data)
				continue
			}

			// Extract text content
			if claudeStreamResp.Type == "content_block_delta" &&
				(claudeStreamResp.Delta.Type == "text" || claudeStreamResp.Delta.Type == "text_delta") {

				// Escape newlines for SSE format
				escapedText := strings.ReplaceAll(claudeStreamResp.Delta.Text, "\n", "\\n")

				fmt.Fprintf(c.Writer, "data: %s\n\n", escapedText)
				c.Writer.Flush()
				fullResponse.WriteString(claudeStreamResp.Delta.Text)
			}
		} else {
			var claudeStreamResp ClaudeStreamingResponse
			if err := json.Unmarshal([]byte(line), &claudeStreamResp); err == nil {
				if claudeStreamResp.Type == "content_block_delta" &&
					(claudeStreamResp.Delta.Type == "text" || claudeStreamResp.Delta.Type == "text_delta") {

					// Escape newlines for SSE format
					escapedText := strings.ReplaceAll(claudeStreamResp.Delta.Text, "\n", "\\n")

					fmt.Fprintf(c.Writer, "data: %s\n\n", escapedText)
					c.Writer.Flush()
					fullResponse.WriteString(claudeStreamResp.Delta.Text)
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		fmt.Printf("Error reading streaming response: %v\n", err)
		return err
	}

	// Check if we have any remaining buffer content
	if buffer := scanner.Bytes(); len(buffer) > 0 {
		fmt.Printf("Warning: Unprocessed buffer content: %s\n", string(buffer))
	}

	// Save the messages to database after streaming is complete
	if err := saveChatMessages(userID, userMessage, fullResponse.String()); err != nil {
		fmt.Printf("Error saving streaming chat messages: %v\n", err)
	}

	return nil
}

// buildContext creates a context string from user's memories and people
func buildContext(memories []models.Memory, people []models.Person) string {
	var context strings.Builder

	// Add people information
	if len(people) > 0 {
		context.WriteString("Important People in Your Life:\n")
		for _, person := range people {
			context.WriteString(fmt.Sprintf("- %s %s (%s): %s\n",
				person.FirstName, person.LastName, person.Relationship, person.Notes))
		}
		context.WriteString("\n")
	}

	// Add memories information
	if len(memories) > 0 {
		context.WriteString("Your Memories and Events:\n")
		for _, memory := range memories {
			context.WriteString(fmt.Sprintf("- %s (%s): %s\n",
				memory.Title, memory.Type, memory.Content))

			// Add associated people
			if len(memory.People) > 0 {
				peopleNames := make([]string, len(memory.People))
				for i, person := range memory.People {
					peopleNames[i] = person.FirstName + " " + person.LastName
				}
				context.WriteString(fmt.Sprintf("  People involved: %s\n", strings.Join(peopleNames, ", ")))
			}
		}
	}

	return context.String()
}

// saveChatMessages saves both user and assistant messages to the database
func saveChatMessages(userID uuid.UUID, userMessage, assistantMessage string) error {
	// Save user message
	userMsg := models.ChatMessage{
		UserID:  userID,
		Role:    "user",
		Content: userMessage,
	}
	if err := db.DB.Create(&userMsg).Error; err != nil {
		return err
	}

	// Save assistant message
	assistantMsg := models.ChatMessage{
		UserID:  userID,
		Role:    "assistant",
		Content: assistantMessage,
	}
	return db.DB.Create(&assistantMsg).Error
}
