import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
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
      // First, check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username.trim());

      if (checkError) {
        console.error('Error checking username:', checkError);
        // Continue anyway, the unique constraint will catch duplicates
      } else if (existingUser && existingUser.length > 0) {
        setError('Username is already taken');
        setIsLoading(false);
        return;
      }

      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.error('Signup error:', error);
        setError(error.message);
      } else if (data.user) {
        console.log('User created successfully:', data.user.id);
        
        try {
          // Wait a moment for the auth user to be fully created
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Create the user profile with the chosen username
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: data.user.id,
              username: username.trim()
            })
            .select();

          if (profileError) {
            console.error('Error creating user profile:', profileError);
            
            // Check if profile already exists
            const { data: existingProfile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', data.user.id)
              .single();

            if (existingProfile) {
              // Update existing profile
              const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ username: username.trim() })
                .eq('user_id', data.user.id);

              if (updateError) {
                console.error('Error updating user profile:', updateError);
                setError('Account created but there was an issue saving your username. Please contact support.');
              } else {
                console.log('Profile updated successfully');
                setError('Check your email for the confirmation link!');
              }
            } else {
              setError('Account created but there was an issue saving your username. Please contact support.');
            }
          } else {
            console.log('Profile created successfully:', profileData);
            
            // Create admin user record (default to non-admin)
            const { error: adminError } = await supabase
              .from('admin_users')
              .insert({
                user_id: data.user.id,
                is_admin: false
              });

            if (adminError) {
              console.error('Error creating admin user record:', adminError);
              // Don't fail the signup for this, just log it
            }
            
            setError('Check your email for the confirmation link!');
          }
        } catch (profileError) {
          console.error('Error creating user profile:', profileError);
          setError('Account created but there was an issue saving your username. Please contact support.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
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
              <div className={`error-message ${error.includes('Check your email') ? 'success' : ''}`}>
                <span className="error-icon">
                  {error.includes('Check your email') ? '✅' : '⚠️'}
                </span>
                {error}
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
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <span className="btn-icon">
                    {isSignUp ? '🚀' : '→'}
                  </span>
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p className="footer-text">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                className="footer-link"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? ' Sign in here' : ' Sign up here'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 