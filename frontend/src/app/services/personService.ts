import axios from 'axios';

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relationship: string;
  notes: string;
  photoId?: string;
  photoUrl?: string;
}

export interface CreatePersonRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relationship: string;
  notes: string;
  photoId?: string;
}

export const createPerson = async (personData: CreatePersonRequest, token: string): Promise<Person> => {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/people`,
      personData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to create person:', error);
    throw error;
  }
};

export const getPeople = async (token: string): Promise<Person[]> => {
  try {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/people`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to get people:', error);
    throw error;
  }
}; 