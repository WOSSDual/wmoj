import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

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
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h1 style={styles.title}>WMOJ</h1>
        <h2 style={styles.subtitle}>Welcome to the Competitive Programming Platform</h2>
        
        <div style={styles.toggleContainer}>
          <button
            onClick={() => setIsSignUp(false)}
            style={isSignUp ? styles.toggleButton : styles.activeToggleButton}
          >
            Login
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            style={isSignUp ? styles.activeToggleButton : styles.toggleButton}
          >
            Sign Up
          </button>
        </div>

        <form style={styles.form}>
          {isSignUp && (
            <input
              type="text"
              placeholder="Username (3-20 characters)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required={isSignUp}
            />
          )}
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
          
          <button
            type="submit"
            onClick={isSignUp ? handleSignUp : handleLogin}
            disabled={isLoading}
            style={styles.submitButton}
          >
            {isLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Login')}
          </button>
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
  toggleContainer: {
    display: 'flex',
    marginBottom: '1.5rem',
    border: '1px solid #333',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  toggleButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: 'transparent',
    color: '#ccc',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s'
  },
  activeToggleButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#00ff88',
    color: '#000',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  submitButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#00ff88',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  }
};

export default Login; 