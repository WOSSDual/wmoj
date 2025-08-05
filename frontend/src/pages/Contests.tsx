import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { supabase } from '../services/supabase';
import './Contests.css';

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

      // Fetch user's participations using direct Supabase query
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: participationsData, error } = await supabase
          .from('contest_participants')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Error fetching participations:', error);
          setParticipations([]);
        } else {
          setParticipations(participationsData || []);
        }
      }

      setContests(contestsData || []);
    } catch (error) {
      console.error('Error fetching contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinContest = async (contestId: string) => {
    // Prevent joining if already participating
    if (isParticipating(contestId)) {
      alert('You are already participating in this contest');
      return;
    }

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
          // Refresh participations to sync state
          fetchContests();
        } else {
          throw error;
        }
      } else {
        alert('Successfully joined the contest!');
        // Immediately update local state to reflect the new participation
        const newParticipation: ContestParticipant = {
          id: Date.now().toString(), // Temporary ID
          contest_id: contestId,
          user_id: user.id,
          joined_at: new Date().toISOString()
        };
        setParticipations(prev => [...prev, newParticipation]);
      }
    } catch (error: any) {
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
      <div className="contests-page">
        <Navigation />
        <div className="page-container">
          <div className="loading-container">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <p className="loading-text">Loading contests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contests-page">
      <Navigation />
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Contests</h1>
          <p className="page-subtitle">
            Join exciting competitive programming contests and test your skills against others
          </p>
        </div>
        
        {contests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏆</div>
            <h3 className="empty-title">No Active Contests</h3>
            <p className="empty-description">
              There are currently no active contests available. Check back later for new competitions!
            </p>
          </div>
        ) : (
          <div className="contests-grid">
            {contests.map((contest, index) => (
              <div 
                key={contest.id} 
                className="contest-card card animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="contest-header">
                  <h3 className="contest-title">{contest.title}</h3>
                  <span className={`status-badge status-${getContestStatus(contest).toLowerCase()}`}>
                    {getContestStatus(contest)}
                  </span>
                </div>
                
                <p className="contest-description">{contest.description}</p>
                
                <div className="contest-meta">
                  <div className="meta-item">
                    <span className="meta-icon">📅</span>
                    <span className="meta-text">
                      Started: {new Date(contest.start_time).toLocaleDateString()}
                    </span>
                  </div>
                  {contest.end_time && (
                    <div className="meta-item">
                      <span className="meta-icon">⏰</span>
                      <span className="meta-text">
                        Ends: {new Date(contest.end_time).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="contest-actions">
                  {isParticipating(contest.id) ? (
                    <Link
                      to={`/contest/${contest.id}`}
                      className="btn btn-primary"
                    >
                      <span>View Contest</span>
                      <span>→</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => joinContest(contest.id)}
                      disabled={joining === contest.id}
                      className={`btn btn-primary ${joining === contest.id ? 'loading' : ''}`}
                    >
                      {joining === contest.id ? (
                        <>
                          <div className="spinner"></div>
                          <span>Joining...</span>
                        </>
                      ) : (
                        <>
                          <span>Join Contest</span>
                          <span>🏆</span>
                        </>
                      )}
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

export default Contests; 