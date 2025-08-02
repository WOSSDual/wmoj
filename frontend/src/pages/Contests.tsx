import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { supabase } from '../services/supabase';

interface Contest {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  created_at: string;
}

interface ContestParticipant {
  id: string;
  contest_id: string;
  user_id: string;
  joined_at: string;
}

const Contests: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [participations, setParticipations] = useState<ContestParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      // Fetch active contests
      const { data: contestsData } = await supabase
        .from('contests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Fetch user's participations
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: participationsData } = await supabase
          .from('contest_participants')
          .select('*')
          .eq('user_id', user.id);

        setParticipations(participationsData || []);
      }

      setContests(contestsData || []);
    } catch (error) {
      console.error('Error fetching contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinContest = async (contestId: string) => {
    setJoining(contestId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to join contests');
        return;
      }

      const { error } = await supabase
        .from('contest_participants')
        .insert([
          {
            contest_id: contestId,
            user_id: user.id
          }
        ]);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          alert('You are already participating in this contest');
        } else {
          throw error;
        }
      } else {
        alert('Successfully joined the contest!');
        fetchContests(); // Refresh participations
      }
    } catch (error) {
      console.error('Error joining contest:', error);
      alert('Failed to join contest. Please try again.');
    } finally {
      setJoining(null);
    }
  };

  const isParticipating = (contestId: string) => {
    return participations.some(p => p.contest_id === contestId);
  };

  const getContestStatus = (contest: Contest) => {
    if (!contest.is_active) return 'Inactive';
    if (contest.end_time && new Date(contest.end_time) < new Date()) return 'Ended';
    return 'Active';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.content}>
          <div style={styles.loading}>Loading contests...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Navigation />
      <div style={styles.content}>
        <h1 style={styles.title}>Contests</h1>
        
        {contests.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No active contests available.</p>
            <p>Check back later for new contests!</p>
          </div>
        ) : (
          <div style={styles.contestsGrid}>
            {contests.map((contest) => (
              <div key={contest.id} style={styles.contestCard}>
                <div style={styles.contestHeader}>
                  <h3 style={styles.contestTitle}>{contest.title}</h3>
                  <span style={styles.statusBadge}>
                    {getContestStatus(contest)}
                  </span>
                </div>
                
                <p style={styles.contestDescription}>{contest.description}</p>
                
                <div style={styles.contestMeta}>
                  <span>Started: {new Date(contest.start_time).toLocaleDateString()}</span>
                  {contest.end_time && (
                    <span>Ends: {new Date(contest.end_time).toLocaleDateString()}</span>
                  )}
                </div>

                <div style={styles.contestActions}>
                  {isParticipating(contest.id) ? (
                    <Link
                      to={`/contest/${contest.id}`}
                      style={styles.viewContestButton}
                    >
                      View Contest
                    </Link>
                  ) : (
                    <button
                      onClick={() => joinContest(contest.id)}
                      disabled={joining === contest.id}
                      style={styles.joinButton}
                    >
                      {joining === contest.id ? 'Joining...' : 'Join Contest'}
                    </button>
                  )}
                </div>
              </div>
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
  contestsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '1.5rem'
  },
  contestCard: {
    backgroundColor: '#1a1a1a',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #333',
    transition: 'transform 0.2s, border-color 0.2s'
  },
  contestHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  contestTitle: {
    color: '#00ff88',
    margin: 0,
    fontSize: '1.3rem'
  },
  statusBadge: {
    backgroundColor: '#00ff88',
    color: '#000',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  contestDescription: {
    color: '#ccc',
    marginBottom: '1rem',
    lineHeight: '1.5'
  },
  contestMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
    color: '#888',
    fontSize: '0.9rem',
    marginBottom: '1rem'
  },
  contestActions: {
    display: 'flex',
    justifyContent: 'center'
  },
  joinButton: {
    backgroundColor: '#00ff88',
    color: '#000',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    transition: 'background-color 0.2s'
  },
  viewContestButton: {
    backgroundColor: '#0088ff',
    color: '#fff',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    textDecoration: 'none',
    display: 'inline-block',
    textAlign: 'center' as const
  }
};

export default Contests; 