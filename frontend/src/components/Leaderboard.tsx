import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

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

      // Fetch all participants for this contest
      const { data: participants, error: participantsError } = await supabase
        .from('contest_participants')
        .select('*')
        .eq('contest_id', contestId);

      if (participantsError) {
        throw participantsError;
      }

      // Fetch user profiles to get usernames
      const participantUserIds = participants?.map(p => p.user_id) || [];
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .in('user_id', participantUserIds);

      if (profilesError) {
        console.warn('Could not fetch user profiles:', profilesError);
      }

      // Create a map of user IDs to usernames
      const userDisplayNames = new Map<string, string>();
      participants?.forEach(participant => {
        const profile = userProfiles?.find(p => p.user_id === participant.user_id);
        userDisplayNames.set(participant.user_id, profile?.username || `User ${participant.user_id.substring(0, 8)}`);
      });

      // Fetch all problems for this contest
      const { data: problems, error: problemsError } = await supabase
        .from('problems')
        .select('*')
        .eq('contest_id', contestId);

      if (problemsError) {
        throw problemsError;
      }

      // Fetch all submissions for this contest
      const { data: submissions, error: submissionsError } = await supabase
        .from('contest_submissions')
        .select('*')
        .eq('contest_id', contestId);

      if (submissionsError) {
        throw submissionsError;
      }

      // Fetch test cases for all problems to calculate total possible score
      const { data: testCases, error: testCasesError } = await supabase
        .from('test_cases')
        .select('*')
        .in('problem_id', problems.map(p => p.id));

      if (testCasesError) {
        throw testCasesError;
      }

      // Calculate total possible score for the contest
      const totalPossibleScore = problems.reduce((total, problem) => {
        const problemTestCases = testCases.filter(tc => tc.problem_id === problem.id);
        return total + problemTestCases.length;
      }, 0);

      // Group submissions by user
      const userSubmissions = new Map<string, ContestSubmission[]>();
      submissions?.forEach(submission => {
        if (!userSubmissions.has(submission.user_id)) {
          userSubmissions.set(submission.user_id, []);
        }
        userSubmissions.get(submission.user_id)!.push(submission);
      });

      // Calculate scores for each participant
      const leaderboardData: LeaderboardEntry[] = [];

      for (const participant of participants || []) {
        const userSubs = userSubmissions.get(participant.user_id) || [];
        
        // Calculate total score for this user
        const totalScore = userSubs.reduce((sum, sub) => sum + sub.score, 0);
        
        // Count unique problems solved
        const problemsSolved = new Set(userSubs.map(sub => sub.problem_id)).size;

        leaderboardData.push({
          user_id: participant.user_id,
          user_email: userDisplayNames.get(participant.user_id) || 'Unknown User',
          total_score: totalScore,
          total_possible_score: totalPossibleScore,
          problems_solved: problemsSolved,
          total_problems: problems.length
        });
      }

      // Sort by total score (descending), then by problems solved (descending)
      leaderboardData.sort((a, b) => {
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score;
        }
        return b.problems_solved - a.problems_solved;
      });

      setLeaderboard(leaderboardData);

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
                <th style={styles.headerCell}>Problems Solved</th>
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
                  <td style={styles.cell}>
                    <span style={styles.problemsSolved}>
                      {entry.problems_solved}/{entry.total_problems}
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
  problemsSolved: {
    color: '#0088ff',
    fontSize: '1rem'
  }
};

export default Leaderboard; 