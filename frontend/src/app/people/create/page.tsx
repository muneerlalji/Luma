'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import Page from '../../components/page/Page';
import Button from '../../components/button/Button';
import { createPerson, CreatePersonRequest } from '../../services/personService';
import axios from 'axios';
import './page.css';

export default function CreatePerson() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

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
    if (!user || !token) return;
    
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

      const personData: CreatePersonRequest = {
        firstName,
        lastName,
        email,
        phone,
        relationship,
        notes,
        photoId: photoId || undefined,
      };

      await createPerson(personData, token);
      router.push('/people');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create person');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Page>
      <div className="create-person-container">
        <div className="create-person-header">
          <h1>Add New Person</h1>
          <p>Add someone important to your life</p>
        </div>

        <form onSubmit={handleSubmit} className="create-person-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone *</label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="relationship">Relationship *</label>
            <select
              id="relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              required
              className="form-select"
            >
              <option value="">Select relationship</option>
              <option value="family">Family</option>
              <option value="friend">Friend</option>
              <option value="colleague">Colleague</option>
              <option value="partner">Partner</option>
              <option value="acquaintance">Acquaintance</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this person..."
              rows={3}
              className="form-textarea"
            />
          </div>

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
              onClick={() => router.push('/people')}
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
              {isSubmitting ? 'Creating...' : 'Create Person'}
            </Button>
          </div>
        </form>
      </div>
    </Page>
  );
} 