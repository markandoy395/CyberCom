import React, { useState, useEffect } from "react";
import { FiCheckCircle, FiXCircle, FiTrendingUp } from "react-icons/fi";
import { apiGet, API_ENDPOINTS } from "../../../../utils/api";
import "./SubmissionStats.css";

const ChartIcon = () => <span style={{ fontSize: "18px" }}>📈</span>;
const SyncIcon = () => <span style={{ fontSize: "14px" }}>🔄</span>;
const FireIcon = () => <span style={{ fontSize: "18px" }}>🔥</span>;

const SubmissionStats = ({ competitionId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!competitionId) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        // Try to fetch submissions for this competition
        const res = await apiGet(`/competitions/${competitionId}/submissions`);
        
        if (res && res.success && res.data) {
          const submissions = res.data;
          const correctSubmissions = submissions.filter(s => s.is_correct).length;
          const successRate = submissions.length > 0 ? Math.round((correctSubmissions / submissions.length) * 100) : 0;

          setStats({
            totalSubmissions: submissions.length,
            correctSubmissions,
            wrongSubmissions: submissions.length - correctSubmissions,
            successRate,
          });
        } else {
          // If response is invalid, use default stats
          setStats({
            totalSubmissions: 0,
            correctSubmissions: 0,
            wrongSubmissions: 0,
            successRate: 0,
          });
        }
      } catch (error) {
        // If endpoint doesn't exist or any error occurs, use default stats
        console.debug("Submission stats endpoint not available, using defaults:", error?.message);
        setStats({
          totalSubmissions: 0,
          correctSubmissions: 0,
          wrongSubmissions: 0,
          successRate: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [competitionId]);

  if (loading) {
    return <div className="submission-stats skeleton-loading">Loading submission stats...</div>;
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="submission-stats">
      <div className="stats-header">
        <div className="header-title">
          <ChartIcon />
          <h4>Submission Analytics</h4>
        </div>
        <span className="stats-refresh" title="Live updates every 10 seconds">
          <SyncIcon /> Live
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-number" style={{ color: "#6366f1" }}>
            {stats.totalSubmissions}
          </div>
          <div className="stat-label">Total Submissions</div>
          <div className="stat-icon-small">
            <FiTrendingUp />
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-number" style={{ color: "#10b981" }}>
            {stats.correctSubmissions}
          </div>
          <div className="stat-label">Correct</div>
          <div className="stat-icon-small">
            <FiCheckCircle />
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-number" style={{ color: "#ef4444" }}>
            {stats.wrongSubmissions}
          </div>
          <div className="stat-label">Wrong</div>
          <div className="stat-icon-small">
            <FiXCircle />
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-number" style={{ color: "#f59e0b" }}>
            {stats.successRate}%
          </div>
          <div className="stat-label">Success Rate</div>
          <div className="stat-icon-small">
            <FireIcon />
          </div>
        </div>
      </div>

      <div className="stats-progress">
        <div className="progress-label">Submission Distribution</div>
        <div className="progress-bar">
          <div 
            className="progress-segment correct" 
            style={{ width: `${stats.successRate}%` }}
            title={`${stats.correctSubmissions} correct`}
          />
          <div 
            className="progress-segment wrong" 
            style={{ width: `${100 - stats.successRate}%` }}
            title={`${stats.wrongSubmissions} wrong`}
          />
        </div>
      </div>
    </div>
  );
};

export default SubmissionStats;
