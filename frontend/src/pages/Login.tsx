import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setError(error.message);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        setError(error.message);
      } else {
        setError('Check your email for the confirmation link!');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h1 style={styles.title}>WMOJ</h1>
        <h2 style={styles.subtitle}>Welcome to the Competitive Programming Platform</h2>
        
        <form style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          
          {error && <div style={styles.error}>{error}</div>}
          
          <div style={styles.buttonContainer}>
            <button
              type="submit"
              onClick={handleLogin}
              disabled={isLoading}
              style={styles.loginButton}
            >
              {isLoading ? 'Loading...' : 'Login'}
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={isLoading}
              style={styles.signupButton}
            >
              {isLoading ? 'Loading...' : 'Sign Up'}
            </button>
          </div>
        </form>
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
  formContainer: {
    backgroundColor: '#1a1a1a',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    textAlign: 'center' as const,
    color: '#00ff88',
    marginBottom: '0.5rem',
    fontSize: '2rem'
  },
  subtitle: {
    textAlign: 'center' as const,
    color: '#ccc',
    marginBottom: '2rem',
    fontSize: '1rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  },
  input: {
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #333',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: '1rem'
  },
  error: {
    color: '#ff4444',
    textAlign: 'center' as const,
    fontSize: '0.9rem'
  },
  buttonContainer: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem'
  },
  loginButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#00ff88',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  signupButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: 'transparent',
    color: '#00ff88',
    border: '1px solid #00ff88',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem'
  }
};

export default Login; 