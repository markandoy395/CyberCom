export const Profile = () => {
  return (
    <div className="container mt-3">
      <div className="card">
        <h1 className="text-primary mb-2">User Profile</h1>
        <div className="flex gap-2">
          <div className="stats-card stats-card-primary">
            <div className="stats-icon">🏆</div>
            <div className="stats-content">
              <div className="stats-value">1250</div>
              <div className="stats-label">Total Points</div>
            </div>
          </div>
          <div className="stats-card stats-card-success">
            <div className="stats-icon">✅</div>
            <div className="stats-content">
              <div className="stats-value">12</div>
              <div className="stats-label">Challenges Solved</div>
            </div>
          </div>
          <div className="stats-card stats-card-warning">
            <div className="stats-icon">⚡</div>
            <div className="stats-content">
              <div className="stats-value">5</div>
              <div className="stats-label">Badges Earned</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
