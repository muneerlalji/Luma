package testutils

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
)

// AnthropicMock provides a mock implementation of Anthropic API for tests
type AnthropicMock struct {
	server     *httptest.Server
	mutex      sync.RWMutex
	responses  map[string]string
	requestLog []AnthropicRequest
}

// AnthropicRequest represents a request made to the mock API
type AnthropicRequest struct {
	Model    string `json:"model"`
	Messages []struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"messages"`
	Stream bool `json:"stream"`
}

// NewAnthropicMock creates a new Anthropic mock instance
func NewAnthropicMock() *AnthropicMock {
	mock := &AnthropicMock{
		responses:  make(map[string]string),
		requestLog: make([]AnthropicRequest, 0),
	}

	// Create test server
	mock.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mock.handleRequest(w, r)
	}))

	return mock
}

// handleRequest handles incoming requests to the mock API
func (am *AnthropicMock) handleRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request
	var req AnthropicRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	am.mutex.Lock()
	am.requestLog = append(am.requestLog, req)
	am.mutex.Unlock()

	// Generate mock response
	response := am.generateMockResponse(req)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// generateMockResponse generates a mock response based on the request
func (am *AnthropicMock) generateMockResponse(req AnthropicRequest) map[string]interface{} {
	// Default mock response
	response := "This is a mock response from the AI assistant. I'm here to help you with your questions and provide support."

	// Check if we have a custom response for this request
	am.mutex.RLock()
	if customResponse, exists := am.responses[req.Messages[0].Content]; exists {
		response = customResponse
	}
	am.mutex.RUnlock()

	if req.Stream {
		// For streaming requests, return a simple non-streaming response
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"text": response,
				},
			},
		}
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"text": response,
			},
		},
	}
}

// SetupAnthropicMock sets up the Anthropic mock and returns the base URL
func SetupAnthropicMock() *AnthropicMock {
	mock := NewAnthropicMock()
	return mock
}

// GetBaseURL returns the base URL of the mock server
func (am *AnthropicMock) GetBaseURL() string {
	return am.server.URL
}

// Close closes the mock server
func (am *AnthropicMock) Close() {
	am.server.Close()
}

// SetResponse sets a custom response for a specific input
func (am *AnthropicMock) SetResponse(input, response string) {
	am.mutex.Lock()
	defer am.mutex.Unlock()
	am.responses[input] = response
}

// GetRequestCount returns the number of requests made
func (am *AnthropicMock) GetRequestCount() int {
	am.mutex.RLock()
	defer am.mutex.RUnlock()
	return len(am.requestLog)
}

// GetRequests returns all requests made to the mock
func (am *AnthropicMock) GetRequests() []AnthropicRequest {
	am.mutex.RLock()
	defer am.mutex.RUnlock()

	requests := make([]AnthropicRequest, len(am.requestLog))
	copy(requests, am.requestLog)
	return requests
}

// ClearRequests clears the request log
func (am *AnthropicMock) ClearRequests() {
	am.mutex.Lock()
	defer am.mutex.Unlock()
	am.requestLog = make([]AnthropicRequest, 0)
}
