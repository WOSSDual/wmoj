import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import MarkdownRenderer from '../components/MarkdownRenderer';
import './Admin.css';

interface TestCase {
  input: string;
  expected_output: string;
}

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
  contest_id: string | null;
  created_at: string;
}

type TabType = 'create-contest' | 'create-problem' | 'manage-contests' | 'manage-problems';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('create-contest');
  
  // Contest creation state
  const [contestTitle, setContestTitle] = useState('');
  const [contestDescription, setContestDescription] = useState('');
  const [contestEndTime, setContestEndTime] = useState('');
  
  // Problem creation state
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [selectedContestId, setSelectedContestId] = useState<string>('');
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: '', expected_output: '' }
  ]);
  
  // Data state
  const [contests, setContests] = useState<Contest[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Edit states
  const [editingContest, setEditingContest] = useState<Contest | null>(null);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [editContestTitle, setEditContestTitle] = useState('');
  const [editContestDescription, setEditContestDescription] = useState('');
  const [editContestEndTime, setEditContestEndTime] = useState('');
  const [editProblemTitle, setEditProblemTitle] = useState('');
  const [editProblemDescription, setEditProblemDescription] = useState('');
  const [editProblemContestId, setEditProblemContestId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch contests
      const { data: contestsData } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch problems
      const { data: problemsData } = await supabase
        .from('problems')
        .select('*')
        .order('created_at', { ascending: false });

      setContests(contestsData || []);
      setProblems(problemsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: '', expected_output: '' }]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string) => {
    const updatedTestCases = [...testCases];
    updatedTestCases[index][field] = value;
    setTestCases(updatedTestCases);
  };

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contestTitle.trim() || !contestDescription.trim()) {
      setMessage('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('contests')
        .insert([
          {
            title: contestTitle.trim(),
            description: contestDescription.trim(),
            end_time: contestEndTime || null
          }
        ]);

      if (error) {
        throw error;
      }

      setMessage('Contest created successfully!');
      setContestTitle('');
      setContestDescription('');
      setContestEndTime('');
      fetchData();

    } catch (error) {
      console.error('Error creating contest:', error);
      setMessage('Failed to create contest. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!problemTitle.trim() || !problemDescription.trim()) {
      setMessage('Please fill in all required fields');
      return;
    }

    if (testCases.some(tc => !tc.input.trim() || !tc.expected_output.trim())) {
      setMessage('Please fill in all test case fields');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Insert the problem
      const { data: problem, error: problemError } = await supabase
        .from('problems')
        .insert([
          {
            title: problemTitle.trim(),
            description: problemDescription.trim(),
            contest_id: selectedContestId || null
          }
        ])
        .select()
        .single();

      if (problemError) {
        throw problemError;
      }

      // Insert test cases
      const testCasesToInsert = testCases.map(tc => ({
        problem_id: problem.id,
        input: tc.input.trim(),
        expected_output: tc.expected_output.trim()
      }));

      const { error: testCasesError } = await supabase
        .from('test_cases')
        .insert(testCasesToInsert);

      if (testCasesError) {
        throw testCasesError;
      }

      setMessage('Problem created successfully!');
      setProblemTitle('');
      setProblemDescription('');
      setSelectedContestId('');
      setTestCases([{ input: '', expected_output: '' }]);
      fetchData();

    } catch (error) {
      console.error('Error creating problem:', error);
      setMessage('Failed to create problem. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleContestStatus = async (contestId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('contests')
        .update({ is_active: !currentStatus })
        .eq('id', contestId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error updating contest status:', error);
    }
  };

  const deleteContest = async (contestId: string) => {
    if (!window.confirm('Are you sure you want to delete this contest? This will also delete all associated problems and submissions.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', contestId);

      if (error) throw error;
      setMessage('Contest deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting contest:', error);
      setMessage('Failed to delete contest. Please try again.');
    }
  };

  const deleteProblem = async (problemId: string) => {
    if (!window.confirm('Are you sure you want to delete this problem? This will also delete all associated test cases and submissions.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('problems')
        .delete()
        .eq('id', problemId);

      if (error) throw error;
      setMessage('Problem deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting problem:', error);
      setMessage('Failed to delete problem. Please try again.');
    }
  };

  const startEditContest = (contest: Contest) => {
    setEditingContest(contest);
    setEditContestTitle(contest.title);
    setEditContestDescription(contest.description);
    setEditContestEndTime(contest.end_time || '');
  };

  const startEditProblem = (problem: Problem) => {
    setEditingProblem(problem);
    setEditProblemTitle(problem.title);
    setEditProblemDescription(problem.description);
    setEditProblemContestId(problem.contest_id || '');
  };

  const cancelEdit = () => {
    setEditingContest(null);
    setEditingProblem(null);
    setEditContestTitle('');
    setEditContestDescription('');
    setEditContestEndTime('');
    setEditProblemTitle('');
    setEditProblemDescription('');
    setEditProblemContestId('');
  };

  const handleUpdateContest = async () => {
    if (!editingContest || !editContestTitle.trim() || !editContestDescription.trim()) {
      setMessage('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('contests')
        .update({
          title: editContestTitle.trim(),
          description: editContestDescription.trim(),
          end_time: editContestEndTime || null
        })
        .eq('id', editingContest.id);

      if (error) throw error;
      
      setMessage('Contest updated successfully!');
      cancelEdit();
      fetchData();
    } catch (error) {
      console.error('Error updating contest:', error);
      setMessage('Failed to update contest. Please try again.');
    }
  };

  const handleUpdateProblem = async () => {
    if (!editingProblem || !editProblemTitle.trim() || !editProblemDescription.trim()) {
      setMessage('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('problems')
        .update({
          title: editProblemTitle.trim(),
          description: editProblemDescription.trim(),
          contest_id: editProblemContestId || null
        })
        .eq('id', editingProblem.id);

      if (error) throw error;
      
      setMessage('Problem updated successfully!');
      cancelEdit();
      fetchData();
    } catch (error) {
      console.error('Error updating problem:', error);
      setMessage('Failed to update problem. Please try again.');
    }
  };

  const renderCreateContest = () => (
    <div className="admin-section">
      <div className="section-header">
        <h2 className="section-title">Create New Contest</h2>
        <p className="section-subtitle">
          Set up a new competitive programming contest
        </p>
      </div>
      
      <form onSubmit={handleCreateContest} className="admin-form">
        <div className="form-group">
          <label className="form-label">Contest Title *</label>
          <input
            type="text"
            value={contestTitle}
            onChange={(e) => setContestTitle(e.target.value)}
            className="form-input"
            placeholder="Enter contest title"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Contest Description *</label>
          <textarea
            value={contestDescription}
            onChange={(e) => setContestDescription(e.target.value)}
            className="form-textarea"
            placeholder="Enter contest description"
            rows={4}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">End Time (Optional)</label>
          <input
            type="datetime-local"
            value={contestEndTime}
            onChange={(e) => setContestEndTime(e.target.value)}
            className="form-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`btn btn-primary submit-btn ${loading ? 'loading' : ''}`}
        >
          {loading ? (
            <>
              <div className="spinner"></div>
              <span>Creating Contest...</span>
            </>
          ) : (
            <>
              <span>Create Contest</span>
              <span>🏆</span>
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderCreateProblem = () => (
    <div className="admin-section">
      <div className="section-header">
        <h2 className="section-title">Create New Problem</h2>
        <p className="section-subtitle">
          Add a new programming challenge with test cases
        </p>
      </div>
      
      <form onSubmit={handleCreateProblem} className="admin-form">
        <div className="form-group">
          <label className="form-label">Problem Title *</label>
          <input
            type="text"
            value={problemTitle}
            onChange={(e) => setProblemTitle(e.target.value)}
            className="form-input"
            placeholder="Enter problem title"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Problem Description *</label>
          <div className="markdown-help">
            <span className="help-icon">📝</span>
            <span>Supports Markdown and LaTeX. Use $...$ for inline math and $$...$$ for block math.</span>
          </div>
          <textarea
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            className="form-textarea"
            placeholder="Enter problem description using Markdown and LaTeX..."
            rows={8}
            required
          />
          {problemDescription && (
            <div className="markdown-preview">
              <h4 className="preview-title">Preview:</h4>
              <MarkdownRenderer content={problemDescription} />
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Assign to Contest (Optional)</label>
          <select
            value={selectedContestId}
            onChange={(e) => setSelectedContestId(e.target.value)}
            className="form-input"
          >
            <option value="">Standalone Problem</option>
            {contests.map(contest => (
              <option key={contest.id} value={contest.id}>
                {contest.title}
              </option>
            ))}
          </select>
        </div>

        <div className="test-cases-section">
          <div className="test-cases-header">
            <h3 className="section-title">Test Cases *</h3>
            <button
              type="button"
              onClick={addTestCase}
              className="btn btn-secondary add-btn"
            >
              <span>Add Test Case</span>
              <span>➕</span>
            </button>
          </div>

          {testCases.map((testCase, index) => (
            <div key={index} className="test-case card">
              <div className="test-case-header">
                <h4 className="test-case-title">Test Case {index + 1}</h4>
                {testCases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTestCase(index)}
                    className="btn btn-danger remove-btn"
                  >
                    <span>Remove</span>
                    <span>🗑️</span>
                  </button>
                )}
              </div>
              
              <div className="test-case-inputs">
                <div className="input-group">
                  <label className="form-label">Input:</label>
                  <textarea
                    value={testCase.input}
                    onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                    className="form-textarea small"
                    placeholder="Enter test input"
                    rows={3}
                    required
                  />
                </div>
                
                <div className="input-group">
                  <label className="form-label">Expected Output:</label>
                  <textarea
                    value={testCase.expected_output}
                    onChange={(e) => updateTestCase(index, 'expected_output', e.target.value)}
                    className="form-textarea small"
                    placeholder="Enter expected output"
                    rows={3}
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`btn btn-primary submit-btn ${loading ? 'loading' : ''}`}
        >
          {loading ? (
            <>
              <div className="spinner"></div>
              <span>Creating Problem...</span>
            </>
          ) : (
            <>
              <span>Create Problem</span>
              <span>💻</span>
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderManageContests = () => (
    <div className="admin-section">
      <div className="section-header">
        <h2 className="section-title">Manage Contests</h2>
        <p className="section-subtitle">
          View, edit, and manage existing contests
        </p>
      </div>
      
      {contests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <h3 className="empty-title">No Contests Created</h3>
          <p className="empty-description">
            Create your first contest to get started!
          </p>
        </div>
      ) : (
        <div className="list-container">
          {contests.map(contest => (
            <div key={contest.id} className="list-item card">
              {editingContest?.id === contest.id ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input
                      type="text"
                      value={editContestTitle}
                      onChange={(e) => setEditContestTitle(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description *</label>
                    <textarea
                      value={editContestDescription}
                      onChange={(e) => setEditContestDescription(e.target.value)}
                      className="form-textarea"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="datetime-local"
                      value={editContestEndTime}
                      onChange={(e) => setEditContestEndTime(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="edit-actions">
                    <button onClick={handleUpdateContest} className="btn btn-primary">
                      <span>Save</span>
                      <span>✅</span>
                    </button>
                    <button onClick={cancelEdit} className="btn btn-secondary">
                      <span>Cancel</span>
                      <span>❌</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="list-item-header">
                    <h3 className="list-item-title">{contest.title}</h3>
                    <span className={`status-badge ${contest.is_active ? 'status-active' : 'status-inactive'}`}>
                      {contest.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="list-item-description">{contest.description}</p>
                  <div className="list-item-meta">
                    <span className="meta-item">
                      <span className="meta-icon">📅</span>
                      <span>Created: {new Date(contest.created_at).toLocaleDateString()}</span>
                    </span>
                    {contest.end_time && (
                      <span className="meta-item">
                        <span className="meta-icon">⏰</span>
                        <span>Ends: {new Date(contest.end_time).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                  <div className="list-item-actions">
                    <button
                      onClick={() => toggleContestStatus(contest.id, contest.is_active)}
                      className={`btn ${contest.is_active ? 'btn-danger' : 'btn-primary'}`}
                    >
                      <span>{contest.is_active ? 'Deactivate' : 'Activate'}</span>
                      <span>{contest.is_active ? '⏸️' : '▶️'}</span>
                    </button>
                    <button
                      onClick={() => startEditContest(contest)}
                      className="btn btn-secondary"
                    >
                      <span>Edit</span>
                      <span>✏️</span>
                    </button>
                    <button
                      onClick={() => deleteContest(contest.id)}
                      className="btn btn-danger"
                    >
                      <span>Delete</span>
                      <span>🗑️</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderManageProblems = () => (
    <div className="admin-section">
      <div className="section-header">
        <h2 className="section-title">Manage Problems</h2>
        <p className="section-subtitle">
          View, edit, and manage existing problems
        </p>
      </div>
      
      {problems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💻</div>
          <h3 className="empty-title">No Problems Created</h3>
          <p className="empty-description">
            Create your first problem to get started!
          </p>
        </div>
      ) : (
        <div className="list-container">
          {problems.map(problem => (
            <div key={problem.id} className="list-item card">
              {editingProblem?.id === problem.id ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input
                      type="text"
                      value={editProblemTitle}
                      onChange={(e) => setEditProblemTitle(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description *</label>
                    <div className="markdown-help">
                      <span className="help-icon">📝</span>
                      <span>Supports Markdown and LaTeX. Use $...$ for inline math and $$...$$ for block math.</span>
                    </div>
                    <textarea
                      value={editProblemDescription}
                      onChange={(e) => setEditProblemDescription(e.target.value)}
                      className="form-textarea"
                      rows={6}
                      required
                    />
                    {editProblemDescription && (
                      <div className="markdown-preview">
                        <h4 className="preview-title">Preview:</h4>
                        <MarkdownRenderer content={editProblemDescription} />
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign to Contest</label>
                    <select
                      value={editProblemContestId}
                      onChange={(e) => setEditProblemContestId(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Standalone Problem</option>
                      {contests.map(contest => (
                        <option key={contest.id} value={contest.id}>
                          {contest.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-actions">
                    <button onClick={handleUpdateProblem} className="btn btn-primary">
                      <span>Save</span>
                      <span>✅</span>
                    </button>
                    <button onClick={cancelEdit} className="btn btn-secondary">
                      <span>Cancel</span>
                      <span>❌</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="list-item-header">
                    <h3 className="list-item-title">{problem.title}</h3>
                    <span className={`status-badge ${problem.contest_id ? 'status-contest' : 'status-standalone'}`}>
                      {problem.contest_id ? 'Contest Problem' : 'Standalone'}
                    </span>
                  </div>
                  <p className="list-item-description">{problem.description}</p>
                  <div className="list-item-meta">
                    <span className="meta-item">
                      <span className="meta-icon">📅</span>
                      <span>Created: {new Date(problem.created_at).toLocaleDateString()}</span>
                    </span>
                  </div>
                  <div className="list-item-actions">
                    <button
                      onClick={() => startEditProblem(problem)}
                      className="btn btn-secondary"
                    >
                      <span>Edit</span>
                      <span>✏️</span>
                    </button>
                    <button
                      onClick={() => deleteProblem(problem.id)}
                      className="btn btn-danger"
                    >
                      <span>Delete</span>
                      <span>🗑️</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-page">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Admin Console</h1>
          <p className="page-subtitle">
            Manage contests, problems, and platform settings
          </p>
        </div>
        
        <div className="admin-tabs">
          <button
            onClick={() => setActiveTab('create-contest')}
            className={`admin-tab ${activeTab === 'create-contest' ? 'active' : ''}`}
          >
            <span>Create Contest</span>
            <span>🏆</span>
          </button>
          <button
            onClick={() => setActiveTab('create-problem')}
            className={`admin-tab ${activeTab === 'create-problem' ? 'active' : ''}`}
          >
            <span>Create Problem</span>
            <span>💻</span>
          </button>
          <button
            onClick={() => setActiveTab('manage-contests')}
            className={`admin-tab ${activeTab === 'manage-contests' ? 'active' : ''}`}
          >
            <span>Manage Contests</span>
            <span>📋</span>
          </button>
          <button
            onClick={() => setActiveTab('manage-problems')}
            className={`admin-tab ${activeTab === 'manage-problems' ? 'active' : ''}`}
          >
            <span>Manage Problems</span>
            <span>📝</span>
          </button>
        </div>

        {message && (
          <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            <span className="message-icon">
              {message.includes('successfully') ? '✅' : '⚠️'}
            </span>
            <span className="message-text">{message}</span>
          </div>
        )}

        <div className="tab-content">
          {activeTab === 'create-contest' && renderCreateContest()}
          {activeTab === 'create-problem' && renderCreateProblem()}
          {activeTab === 'manage-contests' && renderManageContests()}
          {activeTab === 'manage-problems' && renderManageProblems()}
        </div>
      </div>
    </div>
  );
};

export default Admin; 