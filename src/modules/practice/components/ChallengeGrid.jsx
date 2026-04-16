import { BiSearch } from "../../../utils/icons";
import ChallengeCard from "./ChallengeCard";
import "./ChallengeGrid.css";

const ChallengeGrid = ({
  challenges,
  onChallengeClick,
  onStatusUpdate,
}) => {
  if (challenges.length === 0) {
    return (
      <div className="challenge-grid-empty">
        <div className="empty-icon">
          <BiSearch size={48} />
        </div>
        <h3 className="text-primary">No challenges found</h3>
        <p className="text-secondary">
          Try adjusting your filters or search query
        </p>
      </div>
    );
  }

  return (
    <div className="challenge-grid-container">
      <div className="challenge-grid">
        {challenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            onClick={onChallengeClick}
            onStatusChange={onStatusUpdate}
          />
        ))}
      </div>
    </div>
  );
};

export default ChallengeGrid;
