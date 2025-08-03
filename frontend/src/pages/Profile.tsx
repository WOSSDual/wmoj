import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { supabase } from '../services/supabase';

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

      // Update the username
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ username: newUsername.trim() })
        .eq('user_id', profile.user_id);

      if (updateError) {
        setError('Failed to update username');
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
      <div style={styles.container}>
        <Navigation />
        <div style={styles.content}>
          <div style={styles.loading}>Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.content}>
          <div style={styles.error}>{error}</div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div style={styles.container}>
      <Navigation />
      <div style={styles.content}>
        <h1 style={styles.title}>Profile</h1>
        
        <div style={styles.profileSection}>
          <h2 style={styles.sectionTitle}>Account Information</h2>
          
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <label style={styles.label}>Username</label>
              <div style={styles.usernameDisplay}>
                <span style={styles.currentUsername}>{profile.username}</span>
                <button
                  onClick={() => setNewUsername(profile.username)}
                  style={styles.editButton}
                >
                  Edit
                </button>
              </div>
            </div>
            
            <div style={styles.infoItem}>
              <label style={styles.label}>Member Since</label>
              <span style={styles.value}>
                {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {newUsername !== profile.username && (
            <div style={styles.updateSection}>
              <h3 style={styles.subsectionTitle}>Update Username</h3>
              <div style={styles.updateForm}>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new username"
                  style={styles.input}
                  maxLength={20}
                />
                <button
                  onClick={handleUpdateUsername}
                  disabled={updating}
                  style={styles.updateButton}
                >
                  {updating ? 'Updating...' : 'Update Username'}
                </button>
              </div>
              <p style={styles.helpText}>
                Username must be 3-20 characters, letters, numbers, and underscores only.
              </p>
            </div>
          )}

          {message && (
            <div style={styles.success}>{message}</div>
          )}
          
          {error && (
            <div style={styles.error}>{error}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#fff'
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem'
  },
  title: {
    fontSize: '2.5rem',
    color: '#00ff88',
    marginBottom: '2rem'
  },
  loading: {
    textAlign: 'center' as const,
    fontSize: '1.2rem',
    color: '#ccc'
  },
  error: {
    color: '#ff4444',
    textAlign: 'center' as const,
    fontSize: '1.1rem'
  },
  profileSection: {
    backgroundColor: '#1a1a1a',
    padding: '2rem',
    borderRadius: '8px',
    border: '1px solid #333'
  },
  sectionTitle: {
    color: '#00ff88',
    marginBottom: '1.5rem',
    fontSize: '1.8rem'
  },
  infoGrid: {
    display: 'grid',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem'
  },
  label: {
    color: '#00ff88',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  value: {
    color: '#fff',
    fontSize: '1.1rem'
  },
  usernameDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  currentUsername: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 'bold'
  },
  editButton: {
    backgroundColor: '#0088ff',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  updateSection: {
    borderTop: '1px solid #333',
    paddingTop: '1.5rem',
    marginTop: '1.5rem'
  },
  subsectionTitle: {
    color: '#00ff88',
    marginBottom: '1rem',
    fontSize: '1.3rem'
  },
  updateForm: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },
  input: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#2a2a2a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '1rem'
  },
  updateButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#00ff88',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  helpText: {
    color: '#888',
    fontSize: '0.9rem',
    marginTop: '0.5rem'
  },
  success: {
    color: '#00ff88',
    textAlign: 'center' as const,
    padding: '0.5rem',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: '4px',
    marginTop: '1rem'
  }
};

export default Profile; 