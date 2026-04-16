import "./Statistics.css";

export const Statistics = () => {
  const stats = {
    totalChallenges: 48,
    solvedChallenges: 18,
    attemptedChallenges: 28,
    totalPoints: 2450,
    averageTime: "8m 42s",
    currentStreak: 5,
    maxStreak: 12,
    categories: [
      { name: "Forensics", completed: 8, total: 10, percentage: 80 },
      { name: "Crypto", completed: 5, total: 8, percentage: 62.5 },
      { name: "Web", completed: 3, total: 12, percentage: 25 },
      { name: "Binary", completed: 1, total: 6, percentage: 16.7 },
      { name: "Reverse", completed: 1, total: 6, percentage: 16.7 },
      { name: "Misc", completed: 0, total: 6, percentage: 0 },
    ],
  };

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        <h1>📊 Statistics</h1>
        <p>Track your progress and achievements</p>
      </div>

      <div className="statistics-grid">
        {/* Overview Cards */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{stats.totalPoints}</div>
            <div className="stat-label">Total Points</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {stats.solvedChallenges}/{stats.totalChallenges}
            </div>
            <div className="stat-label">Challenges Solved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {Math.round((stats.solvedChallenges / stats.totalChallenges) * 100)}%
            </div>
            <div className="stat-label">Completion Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.currentStreak}</div>
            <div className="stat-label">Current Streak</div>
          </div>
        </div>

        {/* Category Progress */}
        <div className="category-section">
          <h2>Category Progress</h2>
          <div className="category-list">
            {stats.categories.map((cat) => (
              <div key={cat.name} className="category-item">
                <div className="category-header">
                  <span className="category-name">{cat.name}</span>
                  <span className="category-count">
                    {cat.completed}/{cat.total}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor:
                        cat.percentage >= 80
                          ? "#00c864"
                          : cat.percentage >= 50
                          ? "#ffa500"
                          : "#ff6b6b",
                    }}
                  ></div>
                </div>
                <div className="category-percentage">{cat.percentage.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="achievements-section">
          <h2>Recent Achievements</h2>
          <div className="achievements-grid">
            <div className="achievement-badge">
              <span className="badge-icon">🎯</span>
              <span className="badge-name">First Blood</span>
              <span className="badge-desc">First to solve a challenge</span>
            </div>
            <div className="achievement-badge">
              <span className="badge-icon">⚡</span>
              <span className="badge-name">Speed Demon</span>
              <span className="badge-desc">Solved 5 in a row</span>
            </div>
            <div className="achievement-badge">
              <span className="badge-icon">🏆</span>
              <span className="badge-name">Top Solver</span>
              <span className="badge-desc">2450+ points earned</span>
            </div>
            <div className="achievement-badge locked">
              <span className="badge-icon">👑</span>
              <span className="badge-name">Master</span>
              <span className="badge-desc">Solve 40+ challenges</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
