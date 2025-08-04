import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AuthCallback: React.FC = () => {
  const [message, setMessage] = useState('Processing...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setMessage('Authentication failed. Please try again.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (data.session) {
          setMessage('Authentication successful! Redirecting...');
          setTimeout(() => navigate('/'), 2000);
        } else {
          setMessage('No session found. Redirecting to login...');
          setTimeout(() => navigate('/login'), 2000);
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        setMessage('An unexpected error occurred. Redirecting to login...');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.messageContainer}>
        <h2 style={styles.title}>WMOJ</h2>
        <p style={styles.message}>{message}</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    color: '#fff'
  },
  messageContainer: {
    backgroundColor: '#1a1a1a',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    textAlign: 'center' as const,
    maxWidth: '400px'
  },
  title: {
    color: '#00ff88',
    marginBottom: '1rem',
    fontSize: '2rem'
  },
  message: {
    color: '#ccc',
    fontSize: '1rem',
    margin: 0
  }
};

export default AuthCallback; 