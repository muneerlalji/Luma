package utils

import (
	"fmt"
	"os"
	"strconv"
	"time"

	gomail "gopkg.in/mail.v2"
)

// EmailService defines the interface for email operations
type EmailService interface {
	SendEmail(to, subject, body string) error
}

// DefaultEmailService implements EmailService using SMTP
type DefaultEmailService struct{}

// SendEmail sends an email using SMTP configuration
func (s *DefaultEmailService) SendEmail(to, subject, body string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	smtpFrom := os.Getenv("SMTP_FROM")

	if smtpHost == "" || smtpPort == "" || smtpUser == "" || smtpPass == "" || smtpFrom == "" {
		return fmt.Errorf("SMTP configuration is incomplete")
	}

	port, err := strconv.Atoi(smtpPort)
	if err != nil {
		return fmt.Errorf("invalid SMTP_PORT: %v", err)
	}

	m := gomail.NewMessage()
	m.SetHeader("From", smtpFrom)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/plain", body)

	d := gomail.NewDialer(smtpHost, port, smtpUser, smtpPass)
	d.Timeout = 30 * time.Second
	d.SSL = true

	if err := d.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	return nil
}

// Global email service instance
var emailService EmailService = &DefaultEmailService{}

// SetEmailService sets the global email service (useful for testing)
func SetEmailService(service EmailService) {
	emailService = service
}

// GetEmailService returns the current email service
func GetEmailService() EmailService {
	return emailService
}

// SendEmail is a convenience function that uses the global email service
func SendEmail(to, subject, body string) error {
	return emailService.SendEmail(to, subject, body)
}
