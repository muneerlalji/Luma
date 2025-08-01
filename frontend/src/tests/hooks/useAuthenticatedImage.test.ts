import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuthenticatedImage } from '../../app/hooks/useAuthenticatedImage';
import { getPhotoUrl } from '../../services/photoService';

jest.mock('../../services/photoService');
const mockGetPhotoUrl = getPhotoUrl as jest.MockedFunction<typeof getPhotoUrl>;

describe('useAuthenticatedImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    photoId: 'test-photo-id',
    token: 'test-token',
  };

  it('should return initial loading state', () => {
    // Arrange
    // Act
    const { result } = renderHook(() => useAuthenticatedImage(defaultProps));

    // Assert
    expect(result.current.loading).toBe(true);
    expect(result.current.imageUrl).toBe(null);
    expect(result.current.error).toBe(false);
  });

  it('should successfully load image URL', async () => {
    // Arrange
    const mockUrl = 'https://example.com/test-image.jpg';
    mockGetPhotoUrl.mockResolvedValue(mockUrl);

    // Act
    const { result } = renderHook(() => useAuthenticatedImage(defaultProps));

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.imageUrl).toBe(mockUrl);
    expect(result.current.error).toBe(false);
    expect(mockGetPhotoUrl).toHaveBeenCalledWith('test-photo-id', 'test-token');
  });

  it('should handle error when photoId is missing', async () => {
    // Arrange
    // Act
    const { result } = renderHook(() => 
      useAuthenticatedImage({ ...defaultProps, photoId: '' })
    );

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(true);
    expect(result.current.imageUrl).toBe(null);
    expect(mockGetPhotoUrl).not.toHaveBeenCalled();
  });

  it('should handle error when token is missing', async () => {
    // Arrange
    // Act
    const { result } = renderHook(() => 
      useAuthenticatedImage({ ...defaultProps, token: '' })
    );

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(true);
    expect(result.current.imageUrl).toBe(null);
    expect(mockGetPhotoUrl).not.toHaveBeenCalled();
  });

  it('should handle API error and set fallback URL', async () => {
    // Arrange
    const fallbackUrl = 'https://example.com/fallback.jpg';
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockGetPhotoUrl.mockRejectedValue(new Error('API Error'));

    // Act
    const { result } = renderHook(() => 
      useAuthenticatedImage({ ...defaultProps, fallbackUrl })
    );

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(true);
    expect(result.current.imageUrl).toBe(fallbackUrl);
    expect(mockGetPhotoUrl).toHaveBeenCalledWith('test-photo-id', 'test-token');
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load authenticated image:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should handle API error without fallback URL', async () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockGetPhotoUrl.mockRejectedValue(new Error('API Error'));

    // Act
    const { result } = renderHook(() => useAuthenticatedImage(defaultProps));

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(true);
    expect(result.current.imageUrl).toBe(null);
    expect(mockGetPhotoUrl).toHaveBeenCalledWith('test-photo-id', 'test-token');
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load authenticated image:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should re-run effect when photoId changes', async () => {
    // Arrange
    const mockUrl1 = 'https://example.com/image1.jpg';
    const mockUrl2 = 'https://example.com/image2.jpg';
    
    mockGetPhotoUrl
      .mockResolvedValueOnce(mockUrl1)
      .mockResolvedValueOnce(mockUrl2);

    // Act
    const { result, rerender } = renderHook(
      ({ photoId, token }) => useAuthenticatedImage({ photoId, token }),
      { initialProps: { photoId: 'photo1', token: 'token1' } }
    );

    await waitFor(() => {
      expect(result.current.imageUrl).toBe(mockUrl1);
    });

    rerender({ photoId: 'photo2', token: 'token1' });

    // Assert
    await waitFor(() => {
      expect(result.current.imageUrl).toBe(mockUrl2);
    });

    expect(mockGetPhotoUrl).toHaveBeenCalledTimes(2);
    expect(mockGetPhotoUrl).toHaveBeenNthCalledWith(1, 'photo1', 'token1');
    expect(mockGetPhotoUrl).toHaveBeenNthCalledWith(2, 'photo2', 'token1');
  });

  it('should re-run effect when token changes', async () => {
    // Arrange
    const mockUrl1 = 'https://example.com/image1.jpg';
    const mockUrl2 = 'https://example.com/image2.jpg';
    
    mockGetPhotoUrl
      .mockResolvedValueOnce(mockUrl1)
      .mockResolvedValueOnce(mockUrl2);

    // Act
    const { result, rerender } = renderHook(
      ({ photoId, token }) => useAuthenticatedImage({ photoId, token }),
      { initialProps: { photoId: 'photo1', token: 'token1' } }
    );

    await waitFor(() => {
      expect(result.current.imageUrl).toBe(mockUrl1);
    });

    rerender({ photoId: 'photo1', token: 'token2' });

    // Assert
    await waitFor(() => {
      expect(result.current.imageUrl).toBe(mockUrl2);
    });

    expect(mockGetPhotoUrl).toHaveBeenCalledTimes(2);
    expect(mockGetPhotoUrl).toHaveBeenNthCalledWith(1, 'photo1', 'token1');
    expect(mockGetPhotoUrl).toHaveBeenNthCalledWith(2, 'photo1', 'token2');
  });

  it('should re-run effect when fallbackUrl changes', async () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockGetPhotoUrl.mockRejectedValue(new Error('API Error'));

    // Act
    const { result, rerender } = renderHook(
      ({ photoId, token, fallbackUrl }) => useAuthenticatedImage({ photoId, token, fallbackUrl }),
      { initialProps: { photoId: 'photo1', token: 'token1', fallbackUrl: 'fallback1.jpg' } }
    );

    await waitFor(() => {
      expect(result.current.imageUrl).toBe('fallback1.jpg');
    });

    rerender({ photoId: 'photo1', token: 'token1', fallbackUrl: 'fallback2.jpg' });

    // Assert
    await waitFor(() => {
      expect(result.current.imageUrl).toBe('fallback2.jpg');
    });

    expect(mockGetPhotoUrl).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });

  it('should handle concurrent requests correctly', async () => {
    // Arrange
    const mockUrl = 'https://example.com/test-image.jpg';
    mockGetPhotoUrl.mockResolvedValue(mockUrl);

    // Act
    const { result, rerender } = renderHook(
      ({ photoId, token }) => useAuthenticatedImage({ photoId, token }),
      { initialProps: { photoId: 'photo1', token: 'token1' } }
    );

    rerender({ photoId: 'photo2', token: 'token1' });
    rerender({ photoId: 'photo3', token: 'token1' });

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetPhotoUrl).toHaveBeenCalledWith('photo3', 'token1');
  });

  it('should handle null/undefined photoId and token', async () => {
    // Arrange
    // Act
    const { result } = renderHook(() => 
      useAuthenticatedImage({ photoId: null as any, token: undefined as any })
    );

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(true);
    expect(result.current.imageUrl).toBe(null);
    expect(mockGetPhotoUrl).not.toHaveBeenCalled();
  });

  it('should handle whitespace-only photoId and token', async () => {
    // Arrange
    // Act
    const { result } = renderHook(() => 
      useAuthenticatedImage({ photoId: '   ', token: '\t\n' })
    );

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(true);
    expect(result.current.imageUrl).toBe(null);
    expect(mockGetPhotoUrl).not.toHaveBeenCalled();
  });
});
