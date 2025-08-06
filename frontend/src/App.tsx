import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import { checkAdminStatus } from './services/adminAuth';
import { User } from '@supabase/supabase-js';
import Login from './pages/Login';
import Home from './pages/Home';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import Contests from './pages/Contests';
import ContestDetail from './pages/ContestDetail';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import './App.css';

// Protected Admin Route Component
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const adminStatus = await checkAdminStatus();
      setIsAdmin(adminStatus);
      setLoading(false);
    };
    checkAdmin();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">
            <span className="loading-logo-text">WMOJ</span>
            <div className="loading-logo-glow"></div>
          </div>
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-text">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">
            <span className="loading-logo-text">WMOJ</span>
            <div className="loading-logo-glow"></div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <h2 style={{ color: '#ff4444', marginBottom: '1rem' }}>Access Denied</h2>
            <p style={{ color: '#ccc', marginBottom: '2rem' }}>
              You don't have permission to access the admin panel.
            </p>
            <button 
              onClick={() => window.history.back()} 
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        handleUserProfileCheck(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        handleUserProfileCheck(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserProfileCheck = async (user: User) => {
    try {
      // Check if user profile exists
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // If no profile exists and user has metadata with username, create profile
      if (error && error.code === 'PGRST116' && user.user_metadata?.username) {
        const { secureApi } = await import('./services/secureApi');
        await secureApi.finalizeSignup({
          user_id: user.id,
          username: user.user_metadata.username
        });
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">
            <span className="loading-logo-text">WMOJ</span>
            <div className="loading-logo-glow"></div>
          </div>
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-text">Loading your competitive programming experience...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" /> : <Login />} 
          />
          <Route 
            path="/" 
            element={user ? <Home /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/problems" 
            element={user ? <Problems /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/problem/:id" 
            element={user ? <ProblemDetail /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/contests" 
            element={user ? <Contests /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/contest/:id" 
            element={user ? <ContestDetail /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/admin" 
            element={
              user ? (
                <ProtectedAdminRoute>
                  <Admin />
                </ProtectedAdminRoute>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route 
            path="/profile" 
            element={user ? <Profile /> : <Navigate to="/login" />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;