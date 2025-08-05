import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Leaderboard from '../components/Leaderboard';
import { supabase } from '../services/supabase'; // Only for auth
import { secureApi } from '../services/secureApi';
import './ContestDetail.css';

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
  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchContestData();
    }
  }, [id]);

  const fetchContestData = async () => {
    try {
      // Use the secure API to fetch contest data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to view contest details');
        setLoading(false);
        return;
      }

      // The backend endpoint already fetches everything we need
      const result = await secureApi.getContestData(id!);
      
      if (result.success && result.data) {
        setContest(result.data.contest);
        setProblems(result.data.problems || []);
        setSubmissions(result.data.submissions || []);
        // Note: Test cases are not included in the response for security reasons
        // They're only available to the judge endpoint
      } else {
        setError(result.error || 'Failed to load contest data');
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
    return problems.reduce((total, problem) => {
      const problemTestCases = testCases.filter(tc => tc.problem_id === problem.id);
      return total + problemTestCases.length;
    }, 0);
  };

  if (loading) {
    return (
      <div className="contest-detail-page">
        <Navigation />
        <div className="page-container">
          <div className="loading-container">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <p className="loading-text">Loading contest...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="contest-detail-page">
        <Navigation />
        <div className="page-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">Error Loading Contest</h3>
            <p className="error-description">{error}</p>
            <Link to="/contests" className="btn btn-primary">
              <span>Back to Contests</span>
              <span>←</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contest-detail-page">
      <Navigation />
      <div className="page-container">
        <div className="contest-header">
          <div className="contest-title-section">
            <h1 className="contest-title">{contest.title}</h1>
            <div className="contest-stats">
              <div className="stat-item">
                <span className="stat-icon">📚</span>
                <span className="stat-label">Problems</span>
                <span className="stat-value">{problems.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🏆</span>
                <span className="stat-label">Score</span>
                <span className="stat-value">{getTotalScore()}/{getTotalPossibleScore()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="contest-info card">
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
        </div>

        {/* Leaderboard Section */}
        <div className="leaderboard-section">
          <Leaderboard contestId={contest.id} />
        </div>

        {problems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3 className="empty-title">No Problems Yet</h3>
            <p className="empty-description">
              No problems have been added to this contest yet. Check back later!
            </p>
          </div>
        ) : (
          <div className="problems-section">
            <div className="section-header">
              <h2 className="section-title">Problems</h2>
              <p className="section-subtitle">
                Solve these challenges to earn points and climb the leaderboard
              </p>
            </div>
            
            <div className="problems-grid">
              {problems.map((problem, index) => {
                const submission = getSubmissionForProblem(problem.id);
                const problemTestCases = testCases.filter(tc => tc.problem_id === problem.id);
                const isSolved = submission && submission.score === submission.total_tests && submission.total_tests > 0;
                
                return (
                  <div 
                    key={problem.id} 
                    className={`problem-card card animate-scale-in ${isSolved ? 'solved' : ''}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="problem-header">
                      <h3 className="problem-title">
                        Problem {index + 1}: {problem.title}
                      </h3>
                      <div className="problem-badge">
                        {isSolved ? (
                          <span className="badge-icon">✅</span>
                        ) : submission ? (
                          <span className="badge-icon">🔄</span>
                        ) : (
                          <span className="badge-icon">💻</span>
                        )}
                        <span className="badge-text">
                          {submission ? `${submission.score}/${submission.total_tests}` : `0/${problemTestCases.length}`}
                        </span>
                      </div>
                    </div>

                    <div className="problem-actions">
                      <Link
                        to={`/problem/${problem.id}?contest=${contest.id}`}
                        className={`btn ${isSolved ? 'btn-secondary' : 'btn-primary'}`}
                      >
                        <span>{submission ? 'View Solution' : 'Solve Problem'}</span>
                        <span>{isSolved ? '✅' : '→'}</span>
                      </Link>
                    </div>
                    
                    <div className="problem-glow"></div>
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

export default ContestDetail; 