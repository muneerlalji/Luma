'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Page from '../components/page/Page';
import Button from '../components/button/Button';
import AuthGuard from '../components/auth-guard/AuthGuard';
import axios from 'axios';
import './page.css';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

export default function Profile() {
  const { token, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProfile = async (token: string) => {
    try {
      setLoadingProfile(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/me`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      const userData = response.data;
      setProfile(userData);
      setDisplayName(userData.displayName || '');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Only fetch data when auth is done loading and we have a token
  useEffect(() => {
    if (!authLoading && token && loadingProfile) {
      fetchProfile(token);
    }
  }, [authLoading, token, loadingProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/profile`,
        {
          displayName,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      fetchProfile(token); // Refresh profile data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/change-password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setSuccess('Password changed successfully!');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    if (!token) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/profile`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      logout();
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete account');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      {loadingProfile ? (
        <Page>
          <div className="profile-container">
            <div className="loading">Loading profile...</div>
          </div>
        </Page>
      ) : (
        <Page>
          <div className="profile-container">
            <div className="profile-header">
              <h1>Profile</h1>
              <p>Manage your account settings and information</p>
            </div>

            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}

            <div className="profile-sections">
              {/* Profile Information Section */}
              <div className="profile-section">
                <div className="section-header">
                  <h2>Profile Information</h2>
                  {!isEditing && (
                    <Button
                      onClick={() => setIsEditing(true)}
                      style={{ background: '#2563eb' }}
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>

                {!isEditing ? (
                  <div className="profile-info">
                    <div className="info-row">
                      <label>Email:</label>
                      <span>{profile?.email}</span>
                    </div>
                    <div className="info-row">
                      <label>Display Name:</label>
                      <span>{profile?.displayName || 'Not set'}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="profile-form">
                    <div className="form-group">
                      <label htmlFor="displayName">Display Name</label>
                      <input
                        type="text"
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-actions">
                      <Button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setDisplayName(profile?.displayName || '');
                        }}
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
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Change Password Section */}
              <div className="profile-section">
                <div className="section-header">
                  <h2>Change Password</h2>
                  {!isChangingPassword && (
                    <Button
                      onClick={() => setIsChangingPassword(true)}
                      style={{ background: '#2563eb' }}
                    >
                      Change Password
                    </Button>
                  )}
                </div>

                {isChangingPassword && (
                  <form onSubmit={handleChangePassword} className="profile-form">
                    <div className="form-group">
                      <label htmlFor="currentPassword">Current Password</label>
                      <input
                        type="password"
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="newPassword">New Password</label>
                      <input
                        type="password"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="confirmPassword">Confirm New Password</label>
                      <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-actions">
                      <Button
                        type="button"
                        onClick={() => {
                          setIsChangingPassword(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
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
                        {isSubmitting ? 'Changing...' : 'Change Password'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Danger Zone Section */}
              <div className="profile-section danger-zone">
                <div className="section-header">
                  <h2>Danger Zone</h2>
                </div>
                <div className="danger-content">
                  <p>Once you delete your account, there is no going back. Please be certain.</p>
                  <Button
                    onClick={handleDeleteAccount}
                    style={{ background: '#dc2626' }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete Account'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Page>
      )}
    </AuthGuard>
  );
} 