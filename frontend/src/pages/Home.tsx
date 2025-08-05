import React from 'react';
import Navigation from '../components/Navigation';
import './Home.css';

const Home: React.FC = () => {


  const stats = [
    { label: 'Problems Solved', value: '150+', icon: '✅' },
    { label: 'Active Users', value: '500+', icon: '👥' },
    { label: 'Contests Hosted', value: '25+', icon: '🎯' },
    { label: 'Success Rate', value: '95%', icon: '📈' }
  ];

  return (
    <div className="home-page">
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title animate-fade-in">
            <span className="wobbling-pill">
              Welcome to <span className="gradient-text">WMOJ</span>
            </span>
          </h1>
          <p className="hero-subtitle animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Are you ready for more <span className="gradient-text">CP?</span>
          </p>
          <div className="hero-actions animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <a href="/problems" className="btn btn-primary">
              <span>Start Solving</span>
              <span>→</span>
            </a>
            <a href="/contests" className="btn btn-secondary">
              <span>Join Contest</span>
              <span>🏆</span>
            </a>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="floating-card card-1">
            <div className="card-icon">💻</div>
            <div className="card-text">Python</div>
          </div>
          <div className="floating-card card-2">
            <div className="card-icon">⚡</div>
            <div className="card-text">Fast</div>
          </div>
          <div className="floating-card card-3">
            <div className="card-icon">🎯</div>
            <div className="card-text">Accurate</div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div 
              key={stat.label} 
              className="stat-card card animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>



      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Start Your Journey?</h2>
          <p className="cta-subtitle">
            Join thousands of programmers who are already improving their skills on WMOJ.
          </p>
          <div className="cta-actions">
            <a href="/problems" className="btn btn-primary btn-large">
              <span>Explore Problems</span>
              <span>🚀</span>
            </a>
            <a href="/contests" className="btn btn-secondary btn-large">
              <span>View Contests</span>
              <span>🏆</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 