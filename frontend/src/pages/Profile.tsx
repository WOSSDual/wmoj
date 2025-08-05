import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { supabase } from '../services/supabase';
import { secureApi } from '../services/secureApi';
import './Profile.css';

interface UserProfile {
  user_id: string;
  username: string;
  created_at: string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not found');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        setError('Failed to load profile');
        return;
      }

      setProfile(profileData);
      setNewUsername(profileData.username);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!profile || !newUsername.trim()) {
      setError('Please enter a username');
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      setError('Username must be between 3 and 20 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    if (newUsername === profile.username) {
      setMessage('Username is already set to this value');
      return;
    }

    setUpdating(true);
    setError('');
    setMessage('');

    try {
      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', newUsername.trim())
        .neq('user_id', profile.user_id)
        .single();

      if (existingUser) {
        setError('Username is already taken');
        return;
      }

      // Update the username using backend API
      const updateResult = await secureApi.updateUserProfile({
        username: newUsername.trim()
      });

      if (!updateResult.success) {
        setError(updateResult.error || 'Failed to update username');
        return;
      }

      setMessage('Username updated successfully!');
      setProfile({ ...profile, username: newUsername.trim() });
    } catch (error) {
      console.error('Error updating username:', error);
      setError('Failed to update username');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <Navigation />
        <div className="page-container">
          <div className="loading-container">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <p className="loading-text">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="profile-page">
        <Navigation />
        <div className="page-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">Error Loading Profile</h3>
            <p className="error-description">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="profile-page">
      <Navigation />
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">
            Manage your account settings and preferences
          </p>
        </div>
        
        <div className="profile-section card">
          <div className="section-header">
            <h2 className="section-title">Account Information</h2>
          </div>
          
          <div className="info-grid">
            <div className="info-item">
              <div className="info-icon">👤</div>
              <div className="info-content">
                <label className="info-label">Username</label>
                <div className="username-display">
                  <span className="current-username">{profile.username}</span>
                  <button
                    onClick={() => setNewUsername(profile.username)}
                    className="btn btn-secondary edit-btn"
                  >
                    <span>Edit</span>
                    <span>✏️</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="info-item">
              <div className="info-icon">📅</div>
              <div className="info-content">
                <label className="info-label">Member Since</label>
                <span className="info-value">
                  {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {newUsername !== profile.username && (
            <div className="update-section">
              <div className="section-header">
                <h3 className="section-title">Update Username</h3>
                <p className="section-subtitle">
                  Choose a new username for your account
                </p>
              </div>
              
              <div className="update-form">
                <div className="form-group">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Enter new username"
                    className="form-input"
                    maxLength={20}
                  />
                </div>
                
                <button
                  onClick={handleUpdateUsername}
                  disabled={updating}
                  className={`btn btn-primary update-btn ${updating ? 'loading' : ''}`}
                >
                  {updating ? (
                    <>
                      <div className="spinner"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Username</span>
                      <span>✅</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="help-text">
                <span className="help-icon">💡</span>
                <span>Username must be 3-20 characters, letters, numbers, and underscores only.</span>
              </div>
            </div>
          )}

          {message && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              <span className="success-text">{message}</span>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile; 