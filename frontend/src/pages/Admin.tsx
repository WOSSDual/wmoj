import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

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
    <div>
      <h2 style={styles.sectionTitle}>Create New Contest</h2>
      <form onSubmit={handleCreateContest} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Contest Title *</label>
          <input
            type="text"
            value={contestTitle}
            onChange={(e) => setContestTitle(e.target.value)}
            style={styles.input}
            placeholder="Enter contest title"
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Contest Description *</label>
          <textarea
            value={contestDescription}
            onChange={(e) => setContestDescription(e.target.value)}
            style={styles.textarea}
            placeholder="Enter contest description"
            rows={4}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>End Time (Optional)</label>
          <input
            type="datetime-local"
            value={contestEndTime}
            onChange={(e) => setContestEndTime(e.target.value)}
            style={styles.input}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={styles.submitButton}
        >
          {loading ? 'Creating Contest...' : 'Create Contest'}
        </button>
      </form>
    </div>
  );

  const renderCreateProblem = () => (
    <div>
      <h2 style={styles.sectionTitle}>Create New Problem</h2>
      <form onSubmit={handleCreateProblem} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Problem Title *</label>
          <input
            type="text"
            value={problemTitle}
            onChange={(e) => setProblemTitle(e.target.value)}
            style={styles.input}
            placeholder="Enter problem title"
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Problem Description *</label>
          <textarea
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            style={styles.textarea}
            placeholder="Enter problem description"
            rows={6}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Assign to Contest (Optional)</label>
          <select
            value={selectedContestId}
            onChange={(e) => setSelectedContestId(e.target.value)}
            style={styles.input}
          >
            <option value="">Standalone Problem</option>
            {contests.map(contest => (
              <option key={contest.id} value={contest.id}>
                {contest.title}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.testCasesSection}>
          <div style={styles.testCasesHeader}>
            <h3 style={styles.sectionTitle}>Test Cases *</h3>
            <button
              type="button"
              onClick={addTestCase}
              style={styles.addButton}
            >
              Add Test Case
            </button>
          </div>

          {testCases.map((testCase, index) => (
            <div key={index} style={styles.testCase}>
              <div style={styles.testCaseHeader}>
                <h4>Test Case {index + 1}</h4>
                {testCases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTestCase(index)}
                    style={styles.removeButton}
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div style={styles.testCaseInputs}>
                <div style={styles.inputGroup}>
                  <label style={styles.smallLabel}>Input:</label>
                  <textarea
                    value={testCase.input}
                    onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                    style={styles.smallTextarea}
                    placeholder="Enter test input"
                    rows={3}
                    required
                  />
                </div>
                
                <div style={styles.inputGroup}>
                  <label style={styles.smallLabel}>Expected Output:</label>
                  <textarea
                    value={testCase.expected_output}
                    onChange={(e) => updateTestCase(index, 'expected_output', e.target.value)}
                    style={styles.smallTextarea}
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
          style={styles.submitButton}
        >
          {loading ? 'Creating Problem...' : 'Create Problem'}
        </button>
      </form>
    </div>
  );

  const renderManageContests = () => (
    <div>
      <h2 style={styles.sectionTitle}>Manage Contests</h2>
      {contests.length === 0 ? (
        <p style={styles.emptyMessage}>No contests created yet.</p>
      ) : (
        <div style={styles.listContainer}>
          {contests.map(contest => (
            <div key={contest.id} style={styles.listItem}>
              {editingContest?.id === contest.id ? (
                <div style={styles.editForm}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Title *</label>
                    <input
                      type="text"
                      value={editContestTitle}
                      onChange={(e) => setEditContestTitle(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Description *</label>
                    <textarea
                      value={editContestDescription}
                      onChange={(e) => setEditContestDescription(e.target.value)}
                      style={styles.textarea}
                      rows={3}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>End Time</label>
                    <input
                      type="datetime-local"
                      value={editContestEndTime}
                      onChange={(e) => setEditContestEndTime(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.editActions}>
                    <button onClick={handleUpdateContest} style={styles.saveButton}>
                      Save
                    </button>
                    <button onClick={cancelEdit} style={styles.cancelButton}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={styles.listItemHeader}>
                    <h3>{contest.title}</h3>
                    <span style={contest.is_active ? styles.activeBadge : styles.inactiveBadge}>
                      {contest.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p>{contest.description}</p>
                  <div style={styles.listItemMeta}>
                    <span>Created: {new Date(contest.created_at).toLocaleDateString()}</span>
                    {contest.end_time && (
                      <span>Ends: {new Date(contest.end_time).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div style={styles.listItemActions}>
                    <button
                      onClick={() => toggleContestStatus(contest.id, contest.is_active)}
                      style={contest.is_active ? styles.deactivateButton : styles.activateButton}
                    >
                      {contest.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => startEditContest(contest)}
                      style={styles.editButton}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteContest(contest.id)}
                      style={styles.deleteButton}
                    >
                      Delete
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
    <div>
      <h2 style={styles.sectionTitle}>Manage Problems</h2>
      {problems.length === 0 ? (
        <p style={styles.emptyMessage}>No problems created yet.</p>
      ) : (
        <div style={styles.listContainer}>
          {problems.map(problem => (
            <div key={problem.id} style={styles.listItem}>
              {editingProblem?.id === problem.id ? (
                <div style={styles.editForm}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Title *</label>
                    <input
                      type="text"
                      value={editProblemTitle}
                      onChange={(e) => setEditProblemTitle(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Description *</label>
                    <textarea
                      value={editProblemDescription}
                      onChange={(e) => setEditProblemDescription(e.target.value)}
                      style={styles.textarea}
                      rows={4}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Assign to Contest</label>
                    <select
                      value={editProblemContestId}
                      onChange={(e) => setEditProblemContestId(e.target.value)}
                      style={styles.input}
                    >
                      <option value="">Standalone Problem</option>
                      {contests.map(contest => (
                        <option key={contest.id} value={contest.id}>
                          {contest.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.editActions}>
                    <button onClick={handleUpdateProblem} style={styles.saveButton}>
                      Save
                    </button>
                    <button onClick={cancelEdit} style={styles.cancelButton}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={styles.listItemHeader}>
                    <h3>{problem.title}</h3>
                    <span style={problem.contest_id ? styles.contestBadge : styles.standaloneBadge}>
                      {problem.contest_id ? 'Contest Problem' : 'Standalone'}
                    </span>
                  </div>
                  <p>{problem.description}</p>
                  <div style={styles.listItemMeta}>
                    <span>Created: {new Date(problem.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={styles.listItemActions}>
                    <button
                      onClick={() => startEditProblem(problem)}
                      style={styles.editButton}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProblem(problem.id)}
                      style={styles.deleteButton}
                    >
                      Delete
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
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Admin Console</h1>
        
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('create-contest')}
            style={activeTab === 'create-contest' ? styles.activeTab : styles.tab}
          >
            Create Contest
          </button>
          <button
            onClick={() => setActiveTab('create-problem')}
            style={activeTab === 'create-problem' ? styles.activeTab : styles.tab}
          >
            Create Problem
          </button>
          <button
            onClick={() => setActiveTab('manage-contests')}
            style={activeTab === 'manage-contests' ? styles.activeTab : styles.tab}
          >
            Manage Contests
          </button>
          <button
            onClick={() => setActiveTab('manage-problems')}
            style={activeTab === 'manage-problems' ? styles.activeTab : styles.tab}
          >
            Manage Problems
          </button>
        </div>

        {message && (
          <div style={message.includes('successfully') ? styles.success : styles.error}>
            {message}
          </div>
        )}

        <div style={styles.tabContent}>
          {activeTab === 'create-contest' && renderCreateContest()}
          {activeTab === 'create-problem' && renderCreateProblem()}
          {activeTab === 'manage-contests' && renderManageContests()}
          {activeTab === 'manage-problems' && renderManageProblems()}
        </div>
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
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '2rem',
    borderBottom: '1px solid #333'
  },
  tab: {
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#ccc',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    borderBottom: '2px solid transparent'
  },
  activeTab: {
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#00ff88',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    borderBottom: '2px solid #00ff88'
  },
  tabContent: {
    backgroundColor: '#1a1a1a',
    padding: '2rem',
    borderRadius: '8px',
    border: '1px solid #333'
  },
  sectionTitle: {
    color: '#00ff88',
    marginBottom: '1.5rem',
    fontSize: '1.5rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem'
  },
  label: {
    fontSize: '1.1rem',
    color: '#00ff88'
  },
  smallLabel: {
    fontSize: '0.9rem',
    color: '#ccc'
  },
  input: {
    padding: '0.75rem',
    backgroundColor: '#2a2a2a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '1rem'
  },
  textarea: {
    padding: '0.75rem',
    backgroundColor: '#2a2a2a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '1rem',
    resize: 'vertical' as const
  },
  smallTextarea: {
    padding: '0.5rem',
    backgroundColor: '#2a2a2a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '0.9rem',
    resize: 'vertical' as const
  },
  testCasesSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  },
  testCasesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  addButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#00ff88',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  testCase: {
    backgroundColor: '#2a2a2a',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid #333'
  },
  testCaseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  removeButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#ff4444',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  testCaseInputs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem'
  },
  submitButton: {
    padding: '1rem',
    backgroundColor: '#00ff88',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1.1rem',
    fontWeight: 'bold'
  },
  success: {
    color: '#00ff88',
    textAlign: 'center' as const,
    padding: '0.5rem',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  error: {
    color: '#ff4444',
    textAlign: 'center' as const,
    padding: '0.5rem',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  emptyMessage: {
    color: '#ccc',
    textAlign: 'center' as const,
    fontSize: '1.1rem'
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  },
  listItem: {
    backgroundColor: '#2a2a2a',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #333'
  },
  listItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  listItemMeta: {
    display: 'flex',
    gap: '1rem',
    color: '#888',
    fontSize: '0.9rem',
    marginTop: '0.5rem'
  },
  listItemActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem'
  },
  activeBadge: {
    backgroundColor: '#00ff88',
    color: '#000',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  inactiveBadge: {
    backgroundColor: '#ff4444',
    color: '#fff',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  contestBadge: {
    backgroundColor: '#0088ff',
    color: '#fff',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  standaloneBadge: {
    backgroundColor: '#888',
    color: '#fff',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  activateButton: {
    backgroundColor: '#00ff88',
    color: '#000',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  deactivateButton: {
    backgroundColor: '#ff4444',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  editButton: {
    backgroundColor: '#0088ff',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  },
  editActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem'
  },
  saveButton: {
    backgroundColor: '#00ff88',
    color: '#000',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#888',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  }
};

export default Admin; 