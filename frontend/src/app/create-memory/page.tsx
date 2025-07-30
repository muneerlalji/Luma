'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Page from '../components/page/Page';
import Button from '../components/button/Button';
import PeopleSelector from '../components/people-selector/PeopleSelector';
import AuthGuard from '../components/auth-guard/AuthGuard';
import axios from 'axios';
import './page.css';

export default function CreateMemory() {
  const { token } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('event');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      setError('');

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      let photoId: string | null = null;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/upload-photo`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        photoId = uploadResponse.data.id;
      }

      const memoryData = {
        title,
        type,
        content,
        photoId: photoId,
        peopleIds: selectedPeople,
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/memories`,
        memoryData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      router.push('/memories');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create memory');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <Page>
        <div className="create-memory-container">
          <div className="create-memory-header">
            <h1>Create a New Memory</h1>
            <p>Capture a special moment with a photo and description</p>
          </div>

          <form onSubmit={handleSubmit} className="create-memory-form">
            <div className="form-group">
              <label htmlFor="title">Memory Title *</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your memory"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="type">Memory Type *</label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
                className="form-select"
              >
                <option value="event">Event</option>
                <option value="person">Person</option>
                <option value="place">Place</option>
                <option value="milestone">Milestone</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="content">Description *</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe your memory in detail..."
                required
                rows={4}
                className="form-textarea"
              />
            </div>

            <PeopleSelector
              selectedPeople={selectedPeople}
              onPeopleChange={setSelectedPeople}
            />

            <div className="form-group">
              <label htmlFor="photo">Photo (Optional)</label>
              <div className="photo-upload-section">
                <input
                  type="file"
                  id="photo"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="file-input"
                />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: '#6b7280' }}
                >
                  Choose Photo
                </Button>
              </div>
              {error && <p className="error-message">{error}</p>}
            </div>

            {previewUrl && (
              <div className="photo-preview">
                <img src={previewUrl} alt="Preview" className="preview-image" />
                <Button
                  type="button"
                  onClick={removePhoto}
                  style={{ background: '#dc2626', marginTop: '0.5rem' }}
                >
                  Remove Photo
                </Button>
              </div>
            )}

            <div className="form-actions">
              <Button
                type="button"
                onClick={() => router.push('/memories')}
                style={{ background: '#6b7280' }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                style={{ background: '#2563eb' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Memory'}
              </Button>
            </div>
          </form>
        </div>
      </Page>
    </AuthGuard>
  );
} 