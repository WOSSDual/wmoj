import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { secureApi } from '../services/secureApi';

interface ContestSubmission {
  id: string;
  contest_id: string;
  problem_id: string;
  user_id: string;
  score: number;
  total_tests: number;
  submitted_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  user_email: string;
  total_score: number;
  total_possible_score: number;
  problems_solved: number;
  total_problems: number;
}

interface LeaderboardProps {
  contestId: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ contestId }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Use the backend API to fetch leaderboard data
      const response = await secureApi.getLeaderboard(contestId);
      
      if (response.success && response.data) {
        setLeaderboard(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch leaderboard');
      }

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [contestId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  if (loading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Leaderboard</h2>
        <div style={styles.loading}>Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Leaderboard</h2>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Leaderboard</h2>
      <p style={styles.description}>
        Ranked by total score across all problems.
      </p>
      
      {leaderboard.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No participants yet.</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.headerCell}>Rank</th>
                <th style={styles.headerCell}>User</th>
                <th style={styles.headerCell}>Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr key={entry.user_id} style={styles.row}>
                  <td style={styles.cell}>
                    <span style={getRankStyle(index + 1)}>
                      {index + 1}
                    </span>
                  </td>
                  <td style={styles.cell}>
                    <span style={styles.userEmail}>
                      {entry.user_email}
                    </span>
                  </td>
                  <td style={styles.cell}>
                    <span style={styles.score}>
                      {entry.total_score}/{entry.total_possible_score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const getRankStyle = (rank: number) => {
  if (rank === 1) {
    return { ...styles.rank, color: '#FFD700', fontWeight: 'bold' }; // Gold
  } else if (rank === 2) {
    return { ...styles.rank, color: '#C0C0C0', fontWeight: 'bold' }; // Silver
  } else if (rank === 3) {
    return { ...styles.rank, color: '#CD7F32', fontWeight: 'bold' }; // Bronze
  }
  return styles.rank;
};

const styles = {
  container: {
    backgroundColor: '#1a1a1a',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #333',
    marginBottom: '2rem'
  },
  title: {
    color: '#00ff88',
    marginBottom: '1.5rem',
    fontSize: '1.8rem',
    margin: '0 0 1.5rem 0'
  },
  loading: {
    textAlign: 'center' as const,
    color: '#ccc',
    fontSize: '1.1rem'
  },
  error: {
    color: '#ff4444',
    textAlign: 'center' as const,
    fontSize: '1.1rem'
  },
  emptyState: {
    textAlign: 'center' as const,
    color: '#ccc',
    fontSize: '1.1rem'
  },
  tableContainer: {
    overflowX: 'auto' as const
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    color: '#fff'
  },
  headerRow: {
    backgroundColor: '#2a2a2a'
  },
  headerCell: {
    padding: '1rem',
    textAlign: 'left' as const,
    borderBottom: '1px solid #333',
    color: '#00ff88',
    fontWeight: 'bold',
    fontSize: '1rem'
  },
  row: {
    borderBottom: '1px solid #333',
    '&:hover': {
      backgroundColor: '#2a2a2a'
    }
  },
  cell: {
    padding: '1rem',
    textAlign: 'left' as const
  },
  rank: {
    fontSize: '1.2rem',
    fontWeight: 'bold'
  },
  userEmail: {
    color: '#fff',
    fontSize: '1rem'
  },
  score: {
    color: '#00ff88',
    fontWeight: 'bold',
    fontSize: '1rem'
  },
  description: {
    color: '#888',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
    marginBottom: '1.5rem'
  }
};

export default Leaderboard; 