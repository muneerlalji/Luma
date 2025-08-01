import { useState, useEffect } from 'react';
import { getPhotoUrl } from '../../services/photoService';

interface UseAuthenticatedImageProps {
  photoId: string;
  token: string;
  fallbackUrl?: string;
}

export const useAuthenticatedImage = ({ photoId, token, fallbackUrl }: UseAuthenticatedImageProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      // Trim whitespace and check if values are empty
      const trimmedPhotoId = photoId?.trim();
      const trimmedToken = token?.trim();
      
      if (!trimmedPhotoId || !trimmedToken) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const presignedUrl = await getPhotoUrl(trimmedPhotoId, trimmedToken);
        setImageUrl(presignedUrl);
        setError(false);
      } catch (err) {
        console.error('Failed to load authenticated image:', err);
        setError(true);
        if (fallbackUrl) {
          setImageUrl(fallbackUrl);
        }
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [photoId, token, fallbackUrl]);

  return { imageUrl, loading, error };
}; 