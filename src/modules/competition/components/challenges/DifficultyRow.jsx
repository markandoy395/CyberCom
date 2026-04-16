import { memo } from "react";
import ChallengeCard from "./ChallengeCard";

const DifficultyRow = memo(({ 
  difficulty, 
  challenges, 
  selectedCategory,
  onChallengeClick,
  scrollContainerRef,
  competitionScoring,
}) => {
  const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const isFirstRow = difficulty === "hard";

  return (
    <div className="difficulty-row">
      <div className="difficulty-label">
        <span className="difficulty-title">{difficultyLabel.toUpperCase()}</span>
        <div className="difficulty-divider"></div>
      </div>
      <div className="challenges-scroll" ref={isFirstRow ? scrollContainerRef : null}>
        <div className="challenges-row-content">
          {challenges.map((challenge) => (
            <ChallengeCard 
              key={`${difficulty}-${challenge.id}`}
              challenge={challenge}
              onChallengeClick={onChallengeClick}
              competitionScoring={competitionScoring}
            />
          ))}
          {challenges.length === 0 && (
            <div className="no-challenges">
              {selectedCategory !== "all"
                ? "No challenges found"
                : "No challenges unlocked yet"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

DifficultyRow.displayName = 'DifficultyRow';

export default DifficultyRow;
