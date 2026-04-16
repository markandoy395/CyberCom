import { useState } from "react";
import {
  BiFlag,
  BiCategory,
  BiTrendingUp,
  BiCheckCircle,
  BiChevronUp,
  BiChevronDown,
} from "../../../utils/icons.js";
import "./HeroSection.css";

const HeroSection = ({ stats }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <section className="hero-section">
      <div className="hero-content">
        <div className="hero-header">
          <div className="hero-text">
            <h1 className="hero-title">CTF Practice Arena</h1>
            <p className="hero-description">
              Sharpen your cybersecurity skills in a risk-free environment
            </p>
          </div>

          <button
            className="hero-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand" : "Collapse"}
            aria-label={isCollapsed ? "Expand stats" : "Collapse stats"}
          >
            {isCollapsed ? <BiChevronDown /> : <BiChevronUp />}
          </button>
        </div>

        <div className={`hero-stats ${isCollapsed ? "stats-hidden" : ""}`}>
          <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            {BiFlag({ size: 32, style: { color: '#3b82f6', marginBottom: '0.5rem' } })}
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalChallenges}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Challenges</div>
          </div>
          <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            {BiCheckCircle({ size: 32, style: { color: '#22c55e', marginBottom: '0.5rem' } })}
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.problemsSolved}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Problems Solved</div>
          </div>
          <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            {BiCategory({ size: 32, style: { color: '#8b5cf6', marginBottom: '0.5rem' } })}
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.categories}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Categories</div>
          </div>
          <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            {BiTrendingUp({ size: 32, style: { color: '#22c55e', marginBottom: '0.5rem' } })}
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{`${stats.completedPercentage}%`}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Your Progress</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
