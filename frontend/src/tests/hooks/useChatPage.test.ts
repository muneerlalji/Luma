import { useChatPage } from "@/app/hooks/useChatPage";
import { renderHook, waitFor, act } from "@testing-library/react";

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: { messages: [] } })),
}));

// Mock fetch for streaming
global.fetch = jest.fn();

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    loading: false,
  }),
}));

describe('useChatPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful fetch response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: () => Promise.resolve({ done: true, value: new Uint8Array() })
        })
      }
    });
  });

  it('should render hook without throwing', async () => {
    // Arrange
    // Act
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    // Assert
    expect(result.current).toBeDefined();
  });

  it('should initialize with empty messages', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    // Act
    const { messages } = result.current;

    // Assert
    expect(messages).toEqual([]);
  });

  it('should set input message', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    // Act
    act(() => {
      result.current.setInputMessage('test message');
    });

    await waitFor(() => {
      expect(result.current.inputMessage).toBe('test message');
    });
  });

  it('should send message', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    act(() => {
      result.current.setInputMessage('test message');
    });

    await waitFor(() => {
      expect(result.current.inputMessage).toBe('test message');
    });

    // Act
    await act(async () => {
      await result.current.sendMessage({ preventDefault: jest.fn() } as any);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.messages).toEqual([{
        id: expect.any(String),
        role: 'user',
        content: 'test message',
        createdAt: expect.any(String),
      }, {
        id: expect.any(String),
        role: 'assistant',
        content: '',
        createdAt: expect.any(String),
      }]);
    });
  });

  it('should not send message if input is empty', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    act(() => {
      result.current.setInputMessage('');
    });

    // Act
    await act(async () => {
      await result.current.sendMessage({ preventDefault: jest.fn() } as any);
    });

    // Assert
    expect(result.current.messages).toEqual([]);
  });

  it('should handle API error when sending message', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    act(() => {
      result.current.setInputMessage('test message');
    });

    await waitFor(() => {
      expect(result.current.inputMessage).toBe('test message');
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    // Act
    await act(async () => {
      await result.current.sendMessage({ preventDefault: jest.fn() } as any);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.error).toBe('HTTP error! status: 500');
    });
  });

  it('should handle API error with falsy error message', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    act(() => {
      result.current.setInputMessage('test message');
    });

    await waitFor(() => {
      expect(result.current.inputMessage).toBe('test message');
    });

    (global.fetch as jest.Mock).mockRejectedValue(new Error());

    // Act
    await act(async () => {
      await result.current.sendMessage({ preventDefault: jest.fn() } as any);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.error).toBe('Failed to send message. Please try again.');
      expect(result.current.messages).toEqual([]);
    });
  });

  it('should handle API error with no message property', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    act(() => {
      result.current.setInputMessage('test message');
    });

    await waitFor(() => {
      expect(result.current.inputMessage).toBe('test message');
    });

    // Mock fetch to throw an error object without a message property
    (global.fetch as jest.Mock).mockRejectedValue({});

    // Act
    await act(async () => {
      await result.current.sendMessage({ preventDefault: jest.fn() } as any);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.error).toBe('Failed to send message. Please try again.');
      expect(result.current.messages).toEqual([]);
    });
  });

  it('should handle missing response body reader', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    act(() => {
      result.current.setInputMessage('test message');
    });

    await waitFor(() => {
      expect(result.current.inputMessage).toBe('test message');
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: null,
    });

    // Act
    await act(async () => {
      await result.current.sendMessage({ preventDefault: jest.fn() } as any);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.error).toBe('No response body reader available');
    });
  });

  it('should handle streaming response with data', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    act(() => {
      result.current.setInputMessage('test message');
    });

    await waitFor(() => {
      expect(result.current.inputMessage).toBe('test message');
    });

    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: Hello\\n\n\n') 
        })
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: World\\n\n\n') 
        })
        .mockResolvedValueOnce({ done: true, value: new Uint8Array() })
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    });

    // Act
    await act(async () => {
      await result.current.sendMessage({ preventDefault: jest.fn() } as any);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('Hello\nWorld\n');
    });
  });

  it('should handle streaming response with remaining buffer content when done', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    act(() => {
      result.current.setInputMessage('test message');
    });

    await waitFor(() => {
      expect(result.current.inputMessage).toBe('test message');
    });

    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: Hello\\n\n\n') 
        })
        .mockResolvedValueOnce({ 
          done: true, 
          value: new TextEncoder().encode('data: World\\n\n\n') 
        })
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    });

    // Act
    await act(async () => {
      await result.current.sendMessage({ preventDefault: jest.fn() } as any);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('Hello\nWorld\n');
    });
  });

  it('should handle streaming response with partial buffer content when done', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    act(() => {
      result.current.setInputMessage('test message');
    });

    await waitFor(() => {
      expect(result.current.inputMessage).toBe('test message');
    });

    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: Hello\\n\n\ndata: Wor') 
        })
        .mockResolvedValueOnce({ 
          done: true, 
          value: new TextEncoder().encode('ld\\n\n\n') 
        })
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    });

    // Act
    await act(async () => {
      await result.current.sendMessage({ preventDefault: jest.fn() } as any);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('Hello\nWorld\n');
    });
  });

  it('should handle streaming response with buffer content and empty final value', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    act(() => {
      result.current.setInputMessage('test message');
    });

    await waitFor(() => {
      expect(result.current.inputMessage).toBe('test message');
    });

    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: Hello\\n\n\ndata: World\\n\n\n') 
        })
        .mockResolvedValueOnce({ 
          done: true, 
          value: new Uint8Array() 
        })
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    });

    // Act
    await act(async () => {
      await result.current.sendMessage({ preventDefault: jest.fn() } as any);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('Hello\nWorld\n');
    });
  });

  it('should handle streaming response with empty buffer when done', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    act(() => {
      result.current.setInputMessage('test message');
    });

    await waitFor(() => {
      expect(result.current.inputMessage).toBe('test message');
    });

    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: Hello\\n\n\n') 
        })
        .mockResolvedValueOnce({ 
          done: true, 
          value: new Uint8Array() 
        })
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    });

    // Act
    await act(async () => {
      await result.current.sendMessage({ preventDefault: jest.fn() } as any);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('Hello\n');
    });
  });

  it('should format time correctly', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    // Act
    const formattedTime = result.current.formatTime('2023-12-25T10:30:00.000Z');

    // Assert
    expect(formattedTime).toMatch(/^\d{1,2}:\d{2}/);
  });

  it('should handle loadChatHistory error', async () => {
    // Arrange
    const axios = require('axios');
    axios.get.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useChatPage());

    // Act
    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    // Assert
    expect(result.current.error).toBe('Failed to load chat history. Please try again.');
  });

  it('should handle loadChatHistory with null messages', async () => {
    // Arrange
    const axios = require('axios');
    axios.get.mockResolvedValueOnce({ data: { messages: null } });

    const { result } = renderHook(() => useChatPage());

    // Act
    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    // Assert
    expect(result.current.messages).toEqual([]);
  });

  it('should handle streaming response with empty data and [DONE]', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    act(() => {
      result.current.setInputMessage('test message');
    });

    await waitFor(() => {
      expect(result.current.inputMessage).toBe('test message');
    });

    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ 
          done: true, 
          value: new TextEncoder().encode('data: Hello\\n\n\ndata: \n\n\ndata: [DONE]\n\n\n') 
        })
        .mockResolvedValueOnce({ done: true, value: new Uint8Array() })
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    });

    // Act
    await act(async () => {
      await result.current.sendMessage({ preventDefault: jest.fn() } as any);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('Hello\n');
    });
  });

  it('should handle streaming response with whitespace-only data in buffer processing', async () => {
    // Arrange
    const { result } = renderHook(() => useChatPage());

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    act(() => {
      result.current.setInputMessage('test message');
    });

    await waitFor(() => {
      expect(result.current.inputMessage).toBe('test message');
    });

    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: Hello\\n\n\ndata:   \n\n\ndata: World\\n\n\n') 
        })
        .mockResolvedValueOnce({ done: true, value: new Uint8Array() })
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    });

    // Act
    await act(async () => {
      await result.current.sendMessage({ preventDefault: jest.fn() } as any);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('Hello\nWorld\n');
    });
  });
});