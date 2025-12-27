export const Admin = () => {
  return (
    <div className="container mt-3">
      <div className="card">
        <h1 className="text-primary mb-2">Admin Dashboard</h1>
        <div className="grid-cols-3 gap-2 mt-2">
          <div className="admin-stat-card">
            <div className="admin-stat-value">156</div>
            <div className="admin-stat-label">Total Users</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">48</div>
            <div className="admin-stat-label">Active Challenges</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">3</div>
            <div className="admin-stat-label">Active Competitions</div>
          </div>
        </div>
      </div>
    </div>
  );
};
