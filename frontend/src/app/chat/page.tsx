'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Page from '../components/page/Page';
import axios from 'axios';
import './page.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    loadChatHistory();
  }, [user, router]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    if (!token) return;
    
    try {
      setLoadingHistory(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading || !token) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setError('');

    // Add user message immediately
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMessage]);

    // Add a placeholder assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Set streaming state
    setStreamingMessageId(assistantMessageId);

    try {
      // Use fetch for streaming support
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat?stream=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Debug response headers
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('Response type:', response.type);
      console.log('Response body used:', response.bodyUsed);

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Streaming complete. Total chunks:', chunkCount);
          break;
        }
        
        chunkCount++;
        const chunk = decoder.decode(value, { stream: true });
        console.log(`Chunk ${chunkCount}:`, chunk);
        console.log(`Chunk ${chunkCount} length:`, chunk.length);
        
        // Parse Server-Sent Events format
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            if (data.trim() && data !== '[DONE]') {
              console.log('Extracted data:', data);
              accumulatedContent += data;
            }
          }
        }
        
        console.log('Accumulated content length:', accumulatedContent.length);
        console.log('Accumulated content:', accumulatedContent);
        
        // Update the assistant message with accumulated content
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: accumulatedContent }
            : msg
        ));
      }

    } catch (error: any) {
      setError(error.message || 'Failed to send message. Please try again.');
      
      // Remove both messages if the request failed
      setMessages(prev => prev.filter(msg => 
        msg.id !== newUserMessage.id && msg.id !== assistantMessageId
      ));
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!user) {
    return null;
  }

  if (loadingHistory) {
    return (
      <Page>
        <div className="chat-container">
          <div className="loading">Loading chat history...</div>
        </div>
      </Page>
    );
  }

  return (
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
  );
} 