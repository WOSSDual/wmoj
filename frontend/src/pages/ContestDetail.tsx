import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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

interface Problem {
  id: string;
  title: string;
  description: string;
  contest_id: string;
  created_at: string;
}

interface ContestSubmission {
  id: string;
  contest_id: string;
  problem_id: string;
  user_id: string;
  score: number;
  total_tests: number;
  submitted_at: string;
}

const ContestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [submissions, setSubmissions] = useState<ContestSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchContestData();
    }
  }, [id]);

  const fetchContestData = async () => {
    try {
      // Fetch contest details
      const { data: contestData, error: contestError } = await supabase
        .from('contests')
        .select('*')
        .eq('id', id)
        .single();

      if (contestError || !contestData) {
        setError('Contest not found');
        return;
      }

      setContest(contestData);

      // Fetch contest problems
      const { data: problemsData } = await supabase
        .from('problems')
        .select('*')
        .eq('contest_id', id)
        .order('created_at', { ascending: true });

      setProblems(problemsData || []);

      // Fetch user's submissions for this contest
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: submissionsData } = await supabase
          .from('contest_submissions')
          .select('*')
          .eq('contest_id', id)
          .eq('user_id', user.id);

        setSubmissions(submissionsData || []);
      }

    } catch (error) {
      console.error('Error fetching contest data:', error);
      setError('Failed to load contest data');
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionForProblem = (problemId: string) => {
    return submissions.find(s => s.problem_id === problemId);
  };

  const getTotalScore = () => {
    return submissions.reduce((total, submission) => total + submission.score, 0);
  };

  const getTotalPossibleScore = () => {
    return submissions.reduce((total, submission) => total + submission.total_tests, 0);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.content}>
          <div style={styles.loading}>Loading contest...</div>
        </div>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.content}>
          <div style={styles.error}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Navigation />
      <div style={styles.content}>
        <div style={styles.contestHeader}>
          <h1 style={styles.title}>{contest.title}</h1>
          <div style={styles.contestStats}>
            <span style={styles.stat}>
              Problems: {problems.length}
            </span>
            <span style={styles.stat}>
              Score: {getTotalScore()}/{getTotalPossibleScore()}
            </span>
          </div>
        </div>

        <div style={styles.contestInfo}>
          <p style={styles.description}>{contest.description}</p>
          <div style={styles.meta}>
            <span>Started: {new Date(contest.start_time).toLocaleDateString()}</span>
            {contest.end_time && (
              <span>Ends: {new Date(contest.end_time).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {problems.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No problems have been added to this contest yet.</p>
            <p>Check back later!</p>
          </div>
        ) : (
          <div style={styles.problemsSection}>
            <h2 style={styles.sectionTitle}>Problems</h2>
            <div style={styles.problemsGrid}>
              {problems.map((problem, index) => {
                const submission = getSubmissionForProblem(problem.id);
                return (
                  <div key={problem.id} style={styles.problemCard}>
                    <div style={styles.problemHeader}>
                      <h3 style={styles.problemTitle}>
                        Problem {index + 1}: {problem.title}
                      </h3>
                      {submission && (
                        <span style={styles.scoreBadge}>
                          {submission.score}/{submission.total_tests}
                        </span>
                      )}
                    </div>
                    
                    <p style={styles.problemDescription}>
                      {problem.description.length > 150
                        ? `${problem.description.substring(0, 150)}...`
                        : problem.description}
                    </p>

                    <div style={styles.problemActions}>
                      <Link
                        to={`/problem/${problem.id}?contest=${contest.id}`}
                        style={styles.solveButton}
                      >
                        {submission ? 'View Solution' : 'Solve Problem'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
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
  contestHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap' as const,
    gap: '1rem'
  },
  title: {
    fontSize: '2.5rem',
    color: '#00ff88',
    margin: 0
  },
  contestStats: {
    display: 'flex',
    gap: '1rem'
  },
  stat: {
    backgroundColor: '#1a1a1a',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    color: '#00ff88',
    fontWeight: 'bold'
  },
  contestInfo: {
    backgroundColor: '#1a1a1a',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #333',
    marginBottom: '2rem'
  },
  description: {
    color: '#ccc',
    lineHeight: '1.6',
    marginBottom: '1rem'
  },
  meta: {
    display: 'flex',
    gap: '1rem',
    color: '#888',
    fontSize: '0.9rem'
  },
  loading: {
    textAlign: 'center' as const,
    fontSize: '1.2rem',
    color: '#ccc'
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
  problemsSection: {
    marginTop: '2rem'
  },
  sectionTitle: {
    color: '#00ff88',
    marginBottom: '1.5rem',
    fontSize: '1.8rem'
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
    transition: 'transform 0.2s, border-color 0.2s'
  },
  problemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  problemTitle: {
    color: '#00ff88',
    margin: 0,
    fontSize: '1.2rem',
    flex: 1
  },
  scoreBadge: {
    backgroundColor: '#0088ff',
    color: '#fff',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    marginLeft: '0.5rem'
  },
  problemDescription: {
    color: '#ccc',
    marginBottom: '1rem',
    lineHeight: '1.5'
  },
  problemActions: {
    display: 'flex',
    justifyContent: 'center'
  },
  solveButton: {
    backgroundColor: '#00ff88',
    color: '#000',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    textDecoration: 'none',
    display: 'inline-block',
    textAlign: 'center' as const,
    transition: 'background-color 0.2s'
  }
};

export default ContestDetail; 