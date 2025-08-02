import React from 'react';
import Navigation from '../components/Navigation';

const Home: React.FC = () => {
  return (
    <div style={styles.container}>
      <Navigation />
      <div style={styles.content}>
        <h1 style={styles.title}>Welcome to WMOJ</h1>
        <p style={styles.subtitle}>
          Your competitive programming platform for solving challenging problems
        </p>
        <div style={styles.features}>
          <div style={styles.feature}>
            <h3>Solve Problems</h3>
            <p>Access a collection of carefully crafted programming challenges</p>
          </div>
          <div style={styles.feature}>
            <h3>Submit Solutions</h3>
            <p>Upload your Python code and get instant feedback</p>
          </div>
          <div style={styles.feature}>
            <h3>Track Progress</h3>
            <p>Monitor your performance and improve your skills</p>
          </div>
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
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '4rem 2rem',
    textAlign: 'center' as const
  },
  title: {
    fontSize: '3rem',
    color: '#00ff88',
    marginBottom: '1rem'
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#ccc',
    marginBottom: '3rem'
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    marginTop: '3rem'
  },
  feature: {
    backgroundColor: '#1a1a1a',
    padding: '2rem',
    borderRadius: '8px',
    border: '1px solid #333'
  }
};

export default Home; 