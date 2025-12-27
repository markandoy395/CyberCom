import ChallengeCard from "./ChallengeCard";
import "./ChallengeGrid.css";

const ChallengeGrid = ({ challenges, loading }) => {
  if (loading) {
    return (
      <div className="challenge-grid-loading">
        <div className="loading-spinner"></div>
        <p className="text-secondary">Loading challenges...</p>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="challenge-grid-empty">
        <div className="empty-icon">🔍</div>
        <h3 className="text-primary">No challenges found</h3>
        <p className="text-secondary">
          Try adjusting your filters or search query
        </p>
      </div>
    );
  }

  return (
    <div className="challenge-grid">
      {challenges.map((challenge) => (
        <ChallengeCard key={challenge.id} challenge={challenge} />
      ))}
    </div>
  );
};

export default ChallengeGrid;
