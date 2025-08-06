import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { secureApi } from '../services/secureApi';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
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

    // Validate username
    if (!username.trim()) {
      setError('Username is required');
      setIsLoading(false);
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setError('Username must be between 3 and 20 characters');
      setIsLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      setIsLoading(false);
      return;
    }

    try {
      // Use our backend API for the entire signup process
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001'}/api/users/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          username: username.trim()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Automatically log the user in after successful signup
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (loginError) {
          setError('Account created but login failed. Please try logging in manually.');
        } else {
          // Redirect to home page
          navigate('/');
        }
      } else {
        setError(result.error || 'Signup failed');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
        <div className="floating-shape shape-4"></div>
      </div>
      
      <div className="login-container">
        <div className="login-card glass">
          <div className="login-header">
            <h1 className="login-title">
              <span className="gradient-text">WMOJ</span>
            </h1>
            <p className="login-subtitle">
              Welcome to the official White Oaks S.S Competitive Programming Platform
            </p>
          </div>

          <div className="auth-toggle">
            <button
              className={`toggle-btn ${!isSignUp ? 'active' : ''}`}
              onClick={() => setIsSignUp(false)}
            >
              <span className="toggle-icon">🔐</span>
              <span className="toggle-text">Login</span>
            </button>
            <button
              className={`toggle-btn ${isSignUp ? 'active' : ''}`}
              onClick={() => setIsSignUp(true)}
            >
              <span className="toggle-icon">✨</span>
              <span className="toggle-text">Sign Up</span>
            </button>
          </div>

          <form className="login-form" onSubmit={isSignUp ? handleSignUp : handleLogin}>
            {isSignUp && (
              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Choose a username (3-20 characters)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-wrapper">
                <span className="input-icon">📧</span>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className={`error-message ${error.includes('Success!') ? 'success' : ''}`}>
                <span className="error-icon">
                  {error.includes('Success!') ? '✅' : '⚠️'}
                </span>
                <span className="error-text">{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              className={`submit-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">
                    {isSignUp ? '✨' : '🚀'}
                  </span>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p className="footer-text">
              Ready to solve some problems?{' '}
              <a href="#home" className="footer-link">
                Start coding!
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;