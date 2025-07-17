import axios from 'axios';

export interface PhotoResponse {
  url: string;
  filename: string;
  filetype: string;
  uploadedAt: string;
}

export const getPhotoUrl = async (photoId: string, token: string): Promise<string> => {
  try {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/photos/${photoId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    return response.data.url;
  } catch (error) {
    console.error('Failed to get photo URL:', error);
    throw error;
  }
}; 