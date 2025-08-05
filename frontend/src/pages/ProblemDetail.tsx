import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { secureApi } from '../services/secureApi';
import { supabase } from '../services/supabase'; // Only for auth
import MarkdownRenderer from '../components/MarkdownRenderer';
import './ProblemDetail.css';

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
      const result = await secureApi.getProblem(id!);
      
      if (result.success) {
        setProblem(result.data);
      } else {
        setError(result.error || 'Problem not found');
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

      // Save submission using backend API
      const submissionResult = await secureApi.saveContestSubmission({
        contest_id: contestId,
        problem_id: problem.id,
        score: result.passedTests,
        total_tests: result.totalTests
      });

      if (!submissionResult.success) {
        console.error('Error saving contest submission:', submissionResult.error);
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
      <div className="problem-detail-page">
        <Navigation />
        <div className="page-container">
          <div className="loading-container">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <p className="loading-text">Loading problem...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !problem) {
    return (
      <div className="problem-detail-page">
        <Navigation />
        <div className="page-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">Error Loading Problem</h3>
            <p className="error-description">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!problem) return null;

  return (
    <div className="problem-detail-page">
      <Navigation />
      <div className="page-container">
        <div className="problem-header">
          <div className="problem-title-section">
            <h1 className="problem-title">{problem.title}</h1>
            {contestId && (
              <div className="contest-badge">
                <span className="badge-icon">🏆</span>
                <span className="badge-text">Contest Problem</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="problem-section card">
          <div className="section-header">
            <h2 className="section-title">Problem Description</h2>
          </div>
          <div className="problem-description">
            <MarkdownRenderer content={problem.description} />
          </div>
        </div>

        <div className="submission-section card">
          <div className="section-header">
            <h2 className="section-title">Submit Your Solution</h2>
            <p className="section-subtitle">
              Upload your Python code file to test your solution against our test cases
            </p>
          </div>
          
          <div className="file-upload">
            <div className="file-input-wrapper">
              <input
                type="file"
                accept=".py"
                onChange={handleFileChange}
                className="file-input"
                id="code-file"
              />
              <label htmlFor="code-file" className="file-label">
                <span className="file-icon">📁</span>
                <span className="file-text">
                  {selectedFile ? selectedFile.name : 'Choose Python file (.py)'}
                </span>
                <span className="file-button">Browse</span>
              </label>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || submitting}
              className={`btn btn-primary submit-btn ${submitting ? 'loading' : ''}`}
            >
              {submitting ? (
                <>
                  <div className="spinner"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Solution</span>
                  <span>🚀</span>
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}
        </div>

        {judgeResult && (
          <div className="results-section card">
            <div className="section-header">
              <h2 className="section-title">Test Results</h2>
            </div>
            
            <div className="score-display">
              <div className="score-item">
                <span className="score-label">Score</span>
                <span className="score-value">{judgeResult.score}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Test Cases</span>
                <span className="score-value">
                  {judgeResult.passedTests}/{judgeResult.totalTests} passed
                </span>
              </div>
            </div>
            
            <div className="test-results">
              {judgeResult.results.map((result, index) => (
                <div 
                  key={index} 
                  className={`test-result ${result.passed ? 'passed' : 'failed'}`}
                >
                  <div className="test-header">
                    <span className="test-number">Test Case {index + 1}</span>
                    <span className={`test-status ${result.passed ? 'passed' : 'failed'}`}>
                      {result.passed ? '✅ PASSED' : '❌ FAILED'}
                    </span>
                  </div>
                  
                  {!result.passed && (
                    <div className="test-details">
                      <div className="detail-item">
                        <span className="detail-label">Input:</span>
                        <code className="detail-value">{result.input}</code>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Expected:</span>
                        <code className="detail-value">{result.expectedOutput}</code>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Actual:</span>
                        <code className="detail-value">{result.actualOutput}</code>
                      </div>
                      {result.error && (
                        <div className="detail-item">
                          <span className="detail-label">Error:</span>
                          <code className="detail-value error">{result.error}</code>
                        </div>
                      )}
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

export default ProblemDetail; 