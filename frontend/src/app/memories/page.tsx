'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Page from '../components/page/Page';
import Button from '../components/button/Button';
import Photo from '../components/photo/Photo';
import AuthGuard from '../components/auth-guard/AuthGuard';
import axios from 'axios';
import './page.css';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  photoId?: string;
  photoUrl?: string;
}

interface Memory {
  id: string;
  title: string;
  type: string;
  content: string;
  photoId?: string;
  photoUrl?: string;
  people?: Person[];
  createdAt: string;
}

export default function Memories() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [error, setError] = useState('');

  const fetchMemories = async (token: string) => {
    try {
      setLoadingMemories(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/memories`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      setMemories(response.data.memories);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch memories');
    } finally {
      setLoadingMemories(false);
    }
  };

  // Only fetch data when auth is done loading and we have a token
  useEffect(() => {
    if (!authLoading && token && loadingMemories) {
      fetchMemories(token);
    }
  }, [authLoading, token, loadingMemories]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTypeLabel = (type: string) => {
    const typeLabels: { [key: string]: string } = {
      event: 'Event',
      person: 'Person',
      place: 'Place',
      milestone: 'Milestone',
      other: 'Other',
    };
    return typeLabels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const typeColors: { [key: string]: string } = {
      event: '#3b82f6',
      person: '#10b981',
      place: '#f59e0b',
      milestone: '#8b5cf6',
      other: '#6b7280',
    };
    return typeColors[type] || '#6b7280';
  };

  return (
    <AuthGuard>
      {loadingMemories ? (
        <Page>
          <div className="memories-container">
            <div className="loading">Loading memories...</div>
          </div>
        </Page>
      ) : (
        <Page>
          <div className="memories-container">
            <div className="memories-header">
              <div>
                <h1>Your Memories</h1>
                <p>Relive your special moments and cherished experiences</p>
              </div>
              <Button
                onClick={() => router.push('/create-memory')}
                style={{ background: '#2563eb' }}
              >
                Create Memory
              </Button>
            </div>

            {error && (
              <div className="error-message">
                {error}
                <Button
                  onClick={() => token && fetchMemories(token)}
                  style={{ background: '#6b7280', marginLeft: '1rem' }}
                >
                  Try Again
                </Button>
              </div>
            )}

            {memories.length === 0 && !error ? (
              <div className="empty-state">
                <div className="empty-icon">📸</div>
                <h2>No memories yet</h2>
                <p>Start creating your first memory to capture special moments</p>
                <Button
                  onClick={() => router.push('/create-memory')}
                  style={{ background: '#2563eb' }}
                >
                  Create Your First Memory
                </Button>
              </div>
            ) : (
              <div className="memories-grid">
                {memories.map((memory) => (
                  <div key={memory.id} className="memory-card">
                    <div className="memory-header">
                      <h3>{memory.title}</h3>
                      <span
                        className="memory-type"
                        style={{ backgroundColor: getTypeColor(memory.type) }}
                      >
                        {getTypeLabel(memory.type)}
                      </span>
                    </div>
                    <p className="memory-content">{memory.content}</p>
                    
                    {memory.people && memory.people.length > 0 && (
                      <div className="memory-people">
                        <h4>Tagged People:</h4>
                        <div className="people-list">
                          {memory.people.map((person) => (
                            <div key={person.id} className="person-tag">
                              <div className="person-tag-photo">
                                {person.photoUrl ? (
                                  <img src={person.photoUrl} alt={`${person.firstName} ${person.lastName}`} />
                                ) : (
                                  <div className="person-tag-placeholder">
                                    {person.firstName.charAt(0)}{person.lastName.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <span className="person-tag-name">
                                {person.firstName} {person.lastName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {memory.photoId && (
                      <div className="memory-photo">
                        <Photo 
                          photoId={memory.photoId} 
                          token={token!} 
                          alt={memory.title} 
                        />
                      </div>
                    )}
                    <div className="memory-footer">
                      <span className="memory-date">
                        {formatDate(memory.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Page>
      )}
    </AuthGuard>
  );
} 