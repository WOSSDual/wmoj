import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { supabase } from '../services/supabase';
import './Problems.css';

interface Problem {
  id: string;
  title: string;
  description: string;
  contest_id: string | null;
  created_at: string;
}

const Problems: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .is('contest_id', null) // Only standalone problems
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching problems:', error);
      } else {
        setProblems(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProblems = problems.filter(problem =>
    problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    problem.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="problems-page">
        <Navigation />
        <div className="page-container">
          <div className="loading-container">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <p className="loading-text">Loading problems...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="problems-page">
      <Navigation />
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Practice Problems</h1>
          <p className="page-subtitle">
            Master your programming skills with our collection of carefully crafted challenges
          </p>
        </div>

        <div className="search-section">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search for problems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="clear-search"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <div className="search-stats">
            <span className="stat-text">
              {filteredProblems.length} of {problems.length} problems
            </span>
          </div>
        </div>
        
        {problems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3 className="empty-title">No Problems Available</h3>
            <p className="empty-description">
              No standalone problems are available yet. Check out the contests for problems to solve!
            </p>
            <Link to="/contests" className="btn btn-primary">
              <span>Browse Contests</span>
              <span>🏆</span>
            </Link>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3 className="empty-title">No Results Found</h3>
            <p className="empty-description">
              No problems match your search criteria. Try adjusting your search terms.
            </p>
            <button
              className="btn btn-secondary"
              onClick={() => setSearchTerm('')}
            >
              <span>Clear Search</span>
              <span>↺</span>
            </button>
          </div>
        ) : (
          <div className="problems-grid">
            {filteredProblems.map((problem, index) => (
              <Link
                key={problem.id}
                to={`/problem/${problem.id}`}
                className="problem-card card animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="problem-header">
                  <h3 className="problem-title">{problem.title}</h3>
                  <div className="problem-badge">
                    <span className="badge-icon">💻</span>
                    <span className="badge-text">Practice</span>
                  </div>
                </div>
                
                <p className="problem-description">
                  {(() => {
                    // Strip markdown formatting for preview
                    const plainText = problem.description
                      .replace(/#{1,6}\s+/g, '') // Remove headers
                      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
                      .replace(/\*(.*?)\*/g, '$1') // Remove italic
                      .replace(/`(.*?)`/g, '$1') // Remove inline code
                      .replace(/\$\$(.*?)\$\$/g, '') // Remove block math
                      .replace(/\$(.*?)\$/g, '') // Remove inline math
                      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
                      .replace(/\n+/g, ' ') // Replace newlines with spaces
                      .trim();
                    
                    return plainText.length > 150
                      ? `${plainText.substring(0, 150)}...`
                      : plainText;
                  })()}
                </p>
                
                <div className="problem-footer">
                  <div className="problem-meta">
                    <span className="meta-icon">📅</span>
                    <span className="meta-text">
                      {new Date(problem.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="problem-arrow">
                    <span>→</span>
                  </div>
                </div>
                
                <div className="problem-glow"></div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Problems; 