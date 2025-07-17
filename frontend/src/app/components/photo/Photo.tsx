'use client';
import { useAuthenticatedImage } from '../../hooks/useAuthenticatedImage';
import './Photo.css';

interface PhotoProps {
  photoId: string;
  token: string;
  alt: string;
  className?: string;
}

export default function Photo({ photoId, token, alt, className = '' }: PhotoProps) {
  const { imageUrl, loading, error } = useAuthenticatedImage({
    photoId,
    token,
  });

  if (loading) {
    return (
      <div className={`photo-loading ${className}`}>
        <div className="loading-spinner"></div>
        <span>Loading photo...</span>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`photo-error ${className}`}>
        <div className="photo-placeholder">
          Photo unavailable
        </div>
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={alt}
      className={`memory-photo-image ${className}`}
    />
  );
} 