import { useState } from "react";
import {
  BiCheckCircle,
  BiTrendingUp,
  BiStar,
  BiCloudUpload,
  TiWarning,
} from "../../../../utils/icons";
import "./CompetitionSubmissions.css";

// Mock submissions data
const mockSubmissions = [
  {
    id: 1,
    time: "10:34 AM",
    challenge: "Caesar's Secret",
    status: "correct",
    points: 100,
    category: "crypto",
  },
  {
    id: 2,
    time: "10:28 AM",
    challenge: "Hidden Message",
    status: "wrong",
    points: 0,
    category: "forensics",
  },
  {
    id: 3,
    time: "10:15 AM",
    challenge: "SQL Injection 101",
    status: "correct",
    points: 185,
    category: "web",
  },
  {
    id: 4,
    time: "09:58 AM",
    challenge: "Buffer Overflow",
    status: "wrong",
    points: 0,
    category: "binary",
  },
  {
    id: 5,
    time: "09:45 AM",
    challenge: "XSS Attack",
    status: "correct",
    points: 150,
    category: "web",
  },
];

const CompetitionSubmissions = () => {
  const [submissions] = useState(mockSubmissions);
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredSubmissions = submissions.filter((sub) => {
    if (filterStatus === "all") return true;
    return sub.status === filterStatus;
  });

  const correctCount = submissions.filter((s) => s.status === "correct").length;
  const wrongCount = submissions.filter((s) => s.status === "wrong").length;
  const totalPoints = submissions
    .filter((s) => s.status === "correct")
    .reduce((sum, s) => sum + s.points, 0);

  return (
    <div className="competition-submissions">
      {/* Summary Stats */}
      <div className="submissions-summary">
        <div className="summary-card">
          <span className="summary-icon">
            <BiTrendingUp size={24} />
          </span>
          <div className="summary-info">
            <span className="summary-label">Total Submissions</span>
            <span className="summary-value">{submissions.length}</span>
          </div>
        </div>
        <div className="summary-card success">
          <span className="summary-icon">
            <BiCheckCircle size={24} />
          </span>
          <div className="summary-info">
            <span className="summary-label">Correct</span>
            <span className="summary-value">{correctCount}</span>
          </div>
        </div>
        <div className="summary-card error">
          <span className="summary-icon">
            <TiWarning size={24} />
          </span>
          <div className="summary-info">
            <span className="summary-label">Wrong</span>
            <span className="summary-value">{wrongCount}</span>
          </div>
        </div>
        <div className="summary-card points">
          <span className="summary-icon">
            <BiStar size={24} />
          </span>
          <div className="summary-info">
            <span className="summary-label">Points Earned</span>
            <span className="summary-value">{totalPoints}</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="submissions-filter">
        <label className="filter-label">Filter by Status:</label>
        <select
          className="select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Submissions</option>
          <option value="correct">Correct Only</option>
          <option value="wrong">Wrong Only</option>
        </select>
      </div>

      {/* Submissions Table */}
      <div className="submissions-table-container">
        <table className="submissions-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Challenge</th>
              <th>Status</th>
              <th>Points</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.map((submission) => (
              <tr
                key={submission.id}
                className={`submission-row ${submission.status}`}
              >
                <td className="time-cell">{submission.time}</td>
                <td className="challenge-cell">
                  <span className="challenge-name">{submission.challenge}</span>
                  <span className="challenge-category">
                    {submission.category}
                  </span>
                </td>
                <td className="status-cell">
                  {submission.status === "correct" ? (
                    <span className="status-badge status-correct">
                      <span className="status-icon">
                        <BiCheckCircle size={18} />
                      </span>
                      Correct
                    </span>
                  ) : (
                    <span className="status-badge status-wrong">
                      <span className="status-icon">
                        <TiWarning size={18} />
                      </span>
                      Wrong
                    </span>
                  )}
                </td>
                <td className="points-cell">
                  {submission.points > 0 ? (
                    <span className="points-earned">+{submission.points}</span>
                  ) : (
                    <span className="points-none">-</span>
                  )}
                </td>
                <td className="action-cell">
                  {submission.status === "correct" ? (
                    <button className="btn-action btn-view">View</button>
                  ) : (
                    <button className="btn-action btn-retry">Retry</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredSubmissions.length === 0 && (
        <div className="submissions-empty">
          <div className="empty-icon">
            <BiCloudUpload size={48} />
          </div>
          <h3>No submissions found</h3>
          <p>Try adjusting your filter or start solving challenges!</p>
        </div>
      )}
    </div>
  );
};

export default CompetitionSubmissions;
