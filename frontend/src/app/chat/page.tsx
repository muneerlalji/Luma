'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import Page from '../components/page/Page';
import AuthGuard from '../components/auth-guard/AuthGuard';
import axios from 'axios';
import './page.css';
import { ChatMessage, useChatPage } from '../hooks/useChatPage';

export default function ChatPage() {
  const { messages, inputMessage, isLoading, error, loadingHistory, streamingMessageId, messagesEndRef, formatTime, sendMessage, setInputMessage } = useChatPage();

  return (
    <AuthGuard>
      {loadingHistory ? (
        <Page>
          <div className="chat-container">
            <div className="loading">Loading chat history...</div>
          </div>
        </Page>
      ) : (
        <Page>
          <div className="chat-container">
            <div className="chat-header">
              <div>
                <h1>AI Memory Assistant</h1>
                <p>Ask me anything about your memories, people, or events. I'm here to help you remember.</p>
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="chat-messages">
              {messages.length === 0 && !isLoading && (
                <div className="welcome-message">
                  <h3>Welcome to your Memory Assistant!</h3>
                  <p>I can help you remember:</p>
                  <ol>
                    <li key="people">People in your life and their details</li>
                    <li key="events">Important events and memories</li>
                    <li key="personal">Personal information about yourself</li>
                    <li key="questions">Any questions you might have</li>
                  </ol>
                  <p>Just ask me anything - I'm here to help!</p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
                >
                  <div className="message-content">
                    <div className={`message-text ${streamingMessageId === message.id ? 'streaming' : ''}`}>
                      {message.content}
                    </div>
                    <div className="message-time">{formatTime(message.createdAt)}</div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="message assistant-message">
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span key="dot1"></span>
                      <span key="dot2"></span>
                      <span key="dot3"></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="chat-input-form">
              <div className="input-container">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me about your memories, people, or anything else..."
                  disabled={isLoading}
                  className="chat-input"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="send-button"
                >
                  {isLoading ? (
                    <div className="loading-spinner"></div>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22,2 15,22 11,13 2,9"></polygon>
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>
        </Page>
      )}
    </AuthGuard>
  );
} 