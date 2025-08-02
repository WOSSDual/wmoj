import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { supabase } from '../services/supabase';

interface Problem {
  id: string;
  title: string;
  description: string;
  contest_id: string | null;
  created_at: string;
}

interface TestResult {
  testCaseId: string;
  passed: boolean;
  actualOutput?: string;
  expectedOutput?: string;
  input?: string;
  error?: string;
}

interface JudgeResponse {
  score: string;
  passedTests: number;
  totalTests: number;
  results: TestResult[];
}

const ProblemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const contestId = searchParams.get('contest');
  
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [judgeResult, setJudgeResult] = useState<JudgeResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchProblem();
    }
  }, [id]);

  const fetchProblem = async () => {
    try {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError('Problem not found');
      } else {
        setProblem(data);
      }
    } catch (error) {
      setError('Failed to load problem');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.py')) {
      setSelectedFile(file);
      setError('');
    } else {
      setError('Please select a valid Python file (.py)');
      setSelectedFile(null);
    }
  };

  const saveContestSubmission = async (result: JudgeResponse) => {
    if (!contestId || !problem) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user already has a submission for this problem in this contest
      const { data: existingSubmission } = await supabase
        .from('contest_submissions')
        .select('*')
        .eq('contest_id', contestId)
        .eq('problem_id', problem.id)
        .eq('user_id', user.id)
        .single();

      if (existingSubmission) {
        // Update existing submission
        await supabase
          .from('contest_submissions')
          .update({
            score: result.passedTests,
            total_tests: result.totalTests,
            submitted_at: new Date().toISOString()
          })
          .eq('id', existingSubmission.id);
      } else {
        // Create new submission
        await supabase
          .from('contest_submissions')
          .insert([
            {
              contest_id: contestId,
              problem_id: problem.id,
              user_id: user.id,
              score: result.passedTests,
              total_tests: result.totalTests
            }
          ]);
      }
    } catch (error) {
      console.error('Error saving contest submission:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !problem) return;

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('code', selectedFile);
      formData.append('problemId', problem.id);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/judge`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit solution');
      }

      const result = await response.json();
      setJudgeResult(result);

      // Save contest submission if this is a contest problem
      if (contestId) {
        await saveContestSubmission(result);
      }
    } catch (error) {
      setError('Failed to submit solution. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.content}>
          <div style={styles.loading}>Loading problem...</div>
        </div>
      </div>
    );
  }

  if (error && !problem) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.content}>
          <div style={styles.error}>{error}</div>
        </div>
      </div>
    );
  }

  if (!problem) return null;

  return (
    <div style={styles.container}>
      <Navigation />
      <div style={styles.content}>
        <div style={styles.problemHeader}>
          <h1 style={styles.title}>{problem.title}</h1>
          {contestId && (
            <div style={styles.contestInfo}>
              <span style={styles.contestBadge}>Contest Problem</span>
            </div>
          )}
        </div>
        
        <div style={styles.problemSection}>
          <h2 style={styles.sectionTitle}>Problem Description</h2>
          <div style={styles.description}>
            {problem.description.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>

        <div style={styles.submissionSection}>
          <h2 style={styles.sectionTitle}>Submit Your Solution</h2>
          <div style={styles.fileUpload}>
            <input
              type="file"
              accept=".py"
              onChange={handleFileChange}
              style={styles.fileInput}
            />
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || submitting}
              style={styles.submitButton}
            >
              {submitting ? 'Submitting...' : 'Submit Solution'}
            </button>
          </div>
          {error && <div style={styles.error}>{error}</div>}
        </div>

        {judgeResult && (
          <div style={styles.resultsSection}>
            <h2 style={styles.sectionTitle}>Results</h2>
            <div style={styles.score}>
              Score: {judgeResult.score} ({judgeResult.passedTests}/{judgeResult.totalTests} test cases passed)
            </div>
            
            <div style={styles.testResults}>
              {judgeResult.results.map((result, index) => (
                <div key={index} style={styles.testResult}>
                  <div style={styles.testHeader}>
                    <span>Test Case {index + 1}</span>
                    <span style={result.passed ? styles.passed : styles.failed}>
                      {result.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  {!result.passed && (
                    <div style={styles.testDetails}>
                      <div><strong>Input:</strong> {result.input}</div>
                      <div><strong>Expected:</strong> {result.expectedOutput}</div>
                      <div><strong>Actual:</strong> {result.actualOutput}</div>
                      {result.error && <div><strong>Error:</strong> {result.error}</div>}
                    </div>
                  )}
                </div>
              ))}
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
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem'
  },
  problemHeader: {
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
  contestInfo: {
    display: 'flex',
    alignItems: 'center'
  },
  contestBadge: {
    backgroundColor: '#0088ff',
    color: '#fff',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
    fontWeight: 'bold'
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
  problemSection: {
    marginBottom: '3rem'
  },
  submissionSection: {
    marginBottom: '3rem'
  },
  resultsSection: {
    marginTop: '2rem'
  },
  sectionTitle: {
    color: '#00ff88',
    marginBottom: '1rem',
    fontSize: '1.5rem'
  },
  description: {
    backgroundColor: '#1a1a1a',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #333',
    lineHeight: '1.6'
  },
  fileUpload: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  fileInput: {
    flex: 1,
    padding: '0.5rem',
    backgroundColor: '#2a2a2a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#fff'
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#00ff88',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  score: {
    fontSize: '1.2rem',
    color: '#00ff88',
    marginBottom: '1rem',
    fontWeight: 'bold'
  },
  testResults: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  },
  testResult: {
    backgroundColor: '#1a1a1a',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid #333'
  },
  testHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  passed: {
    color: '#00ff88',
    fontWeight: 'bold'
  },
  failed: {
    color: '#ff4444',
    fontWeight: 'bold'
  },
  testDetails: {
    backgroundColor: '#2a2a2a',
    padding: '1rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
    lineHeight: '1.4'
  }
};

export default ProblemDetail; 