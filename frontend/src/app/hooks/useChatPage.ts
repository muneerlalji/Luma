import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export const useChatPage = () => {
  const { token, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChatHistory = async (token: string) => {
    try {
      setLoadingHistory(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(response.data.messages || []);
    } catch (error) {
      setError('Failed to load chat history. Please try again.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Only fetch data when auth is done loading and we have a token
  useEffect(() => {
    if (!authLoading && token && loadingHistory) {
      loadChatHistory(token);
    }
  }, [authLoading, token, loadingHistory]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    scrollToBottom();
  }, [messages]);

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

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder('utf-8', { fatal: false });
      let accumulatedContent = '';
      let chunkCount = 0;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Process any remaining buffer content
          if (value && value.length > 0) {
            const finalChunk = decoder.decode(value, { stream: false });
            buffer += finalChunk;
          }
          
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data.trim() && data !== '[DONE]') {
                  // Unescape newlines from SSE format
                  const unescapedData = data.replace(/\\n/g, '\n');
                  accumulatedContent += unescapedData;
                }
              }
            }
          }
          break;
        }
        
        chunkCount++;
        const chunk = decoder.decode(value, { stream: true });
        
        buffer += chunk;
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim() && data !== '[DONE]') {
              // Unescape newlines from SSE format
              const unescapedData = data.replace(/\\n/g, '\n');
              accumulatedContent += unescapedData;
            }
          }
        }
        
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: accumulatedContent }
            : msg
        ));
      }

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: accumulatedContent }
          : msg
      ));

    } catch (error: any) {
      setError(error.message || 'Failed to send message. Please try again.');
      
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

  return {
    messages,
    inputMessage,
    isLoading,
    error,
    loadingHistory,
    streamingMessageId,
    messagesEndRef,
    formatTime,
    sendMessage,
    setInputMessage,
  }
}