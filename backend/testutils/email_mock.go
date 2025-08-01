package testutils

import (
	"sync"

	"github.com/muneerlalji/Luma/utils"
)

// EmailMock provides a mock implementation of email sending for tests
type EmailMock struct {
	sentEmails []EmailData
	mutex      sync.RWMutex
}

// EmailData represents the data of a sent email
type EmailData struct {
	To      string
	Subject string
	Body    string
}

// NewEmailMock creates a new email mock instance
func NewEmailMock() *EmailMock {
	return &EmailMock{
		sentEmails: make([]EmailData, 0),
	}
}

// SendEmail implements the EmailService interface
func (em *EmailMock) SendEmail(to, subject, body string) error {
	em.mutex.Lock()
	defer em.mutex.Unlock()

	em.sentEmails = append(em.sentEmails, EmailData{
		To:      to,
		Subject: subject,
		Body:    body,
	})
	return nil
}

// SetupEmailMock sets up the email mock as the global email service
func SetupEmailMock() *EmailMock {
	mock := NewEmailMock()
	utils.SetEmailService(mock)
	return mock
}

// GetSentEmails returns all sent emails
func (em *EmailMock) GetSentEmails() []EmailData {
	em.mutex.RLock()
	defer em.mutex.RUnlock()

	// Return a copy to avoid race conditions
	emails := make([]EmailData, len(em.sentEmails))
	copy(emails, em.sentEmails)
	return emails
}

// ClearSentEmails clears the sent emails list
func (em *EmailMock) ClearSentEmails() {
	em.mutex.Lock()
	defer em.mutex.Unlock()

	em.sentEmails = make([]EmailData, 0)
}

// GetEmailCount returns the number of emails sent
func (em *EmailMock) GetEmailCount() int {
	em.mutex.RLock()
	defer em.mutex.RUnlock()

	return len(em.sentEmails)
}

// FindEmailBySubject finds emails by subject
func (em *EmailMock) FindEmailBySubject(subject string) []EmailData {
	em.mutex.RLock()
	defer em.mutex.RUnlock()

	var found []EmailData
	for _, email := range em.sentEmails {
		if email.Subject == subject {
			found = append(found, email)
		}
	}
	return found
}

// FindEmailByRecipient finds emails by recipient
func (em *EmailMock) FindEmailByRecipient(to string) []EmailData {
	em.mutex.RLock()
	defer em.mutex.RUnlock()

	var found []EmailData
	for _, email := range em.sentEmails {
		if email.To == to {
			found = append(found, email)
		}
	}
	return found
}
