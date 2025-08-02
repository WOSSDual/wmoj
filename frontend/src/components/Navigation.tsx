import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const Navigation: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.navContainer}>
        <div style={styles.logo}>
          <Link to="/" style={styles.logoLink}>WMOJ</Link>
        </div>
        <div style={styles.navLinks}>
          <Link to="/" style={styles.navLink}>Home</Link>
          <Link to="/contests" style={styles.navLink}>Contests</Link>
          <Link to="/problems" style={styles.navLink}>Problems</Link>
        </div>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    backgroundColor: '#1a1a1a',
    padding: '1rem 0',
    borderBottom: '1px solid #333'
  },
  navContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 2rem'
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  logoLink: {
    color: '#00ff88',
    textDecoration: 'none'
  },
  navLinks: {
    display: 'flex',
    gap: '2rem'
  },
  navLink: {
    color: '#fff',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  }
};

export default Navigation; 