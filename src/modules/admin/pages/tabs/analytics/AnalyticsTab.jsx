import React from "react";

const FA = ({ icon, title = "" }) => <i className={`fas ${icon}`} title={title}></i>;

const AnalyticsTab = ({ categoryStats }) => {
  return (
    <div className="admin-section">
      <h3>Platform Analytics</h3>
      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Category Statistics</h4>
          <div className="category-stats">
            {categoryStats.map((cat, idx) => (
              <div key={idx} className="category-row">
                <span className="cat-name">{cat.name}</span>
                <div className="cat-stats">
                  <span className="stat-badge">
                    Challenges: {cat.challenges}
                  </span>
                  <span className="stat-badge">
                    Solves: {cat.solves}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
