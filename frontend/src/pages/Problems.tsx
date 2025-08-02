import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { supabase } from '../services/supabase';

interface Problem {
  id: string;
  title: string;
  description: string;
  contest_id: string | null;
  created_at: string;
}

const Problems: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .is('contest_id', null) // Only standalone problems
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching problems:', error);
      } else {
        setProblems(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.content}>
          <div style={styles.loading}>Loading problems...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Navigation />
      <div style={styles.content}>
        <h1 style={styles.title}>Practice Problems</h1>
        <p style={styles.subtitle}>Standalone problems for practice</p>
        
        {problems.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No standalone problems available yet.</p>
            <p>Check out the contests for problems to solve!</p>
          </div>
        ) : (
          <div style={styles.problemsGrid}>
            {problems.map((problem) => (
              <Link
                key={problem.id}
                to={`/problem/${problem.id}`}
                style={styles.problemCard}
              >
                <h3 style={styles.problemTitle}>{problem.title}</h3>
                <p style={styles.problemDescription}>
                  {problem.description.length > 150
                    ? `${problem.description.substring(0, 150)}...`
                    : problem.description}
                </p>
                <div style={styles.problemMeta}>
                  <span>Created: {new Date(problem.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
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
    padding: '2rem'
  },
  title: {
    fontSize: '2.5rem',
    color: '#00ff88',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#ccc',
    marginBottom: '2rem'
  },
  loading: {
    textAlign: 'center' as const,
    fontSize: '1.2rem',
    color: '#ccc'
  },
  emptyState: {
    textAlign: 'center' as const,
    color: '#ccc',
    fontSize: '1.1rem'
  },
  problemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem'
  },
  problemCard: {
    backgroundColor: '#1a1a1a',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #333',
    textDecoration: 'none',
    color: '#fff',
    transition: 'transform 0.2s, border-color 0.2s',
    cursor: 'pointer',
    display: 'block'
  },
  problemTitle: {
    color: '#00ff88',
    marginBottom: '0.5rem',
    fontSize: '1.3rem'
  },
  problemDescription: {
    color: '#ccc',
    marginBottom: '1rem',
    lineHeight: '1.5'
  },
  problemMeta: {
    color: '#888',
    fontSize: '0.9rem'
  }
};

export default Problems; 