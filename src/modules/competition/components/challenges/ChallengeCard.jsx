import { memo, createElement } from "react";
import { CATEGORIES } from "../../../../utils/constants";
import { BiCheckCircle } from "../../../../utils/icons";
import { formatCompetitionPoints } from "../../utils/scoringUtils";

const ChallengeCard = memo(({ challenge, onChallengeClick, competitionScoring }) => {
  const pointsDisplay = formatCompetitionPoints(challenge.points, {
    solverCount: challenge.solverCount,
    isSolved: challenge.status === "solved",
    competitionStartDate: competitionScoring?.startDate,
    competitionEndDate: competitionScoring?.endDate,
    scoringSettings: competitionScoring?.scoringSettings,
  });

  // Use category from challenge data if available, otherwise lookup from CATEGORIES or use default
  let displayCategory = challenge.category;
  
  if (!displayCategory || !displayCategory.name) {
    // No category data, use default
    displayCategory = { 
      id: 'uncategorized', 
      name: 'Uncategorized', 
      color: 'gray',
      icon: null
    };
  } else if (!displayCategory.color) {
    // Has category but missing color/icon, look up from CATEGORIES
    const categoryFromConstant = CATEGORIES.find((c) => c.id === displayCategory.id || c.name === displayCategory.name);
    if (categoryFromConstant) {
      displayCategory = { ...displayCategory, ...categoryFromConstant };
    } else {
      displayCategory = { 
        ...displayCategory,
        color: displayCategory.color || '#6b7280',
        icon: null
      };
    }
  }

  // Ensure displayCategory always has required properties
  if (!displayCategory.name) {
    displayCategory.name = 'Unknown';
  }
  if (!displayCategory.color) {
    displayCategory.color = '#6b7280';
  }

  return (
    <div
      className={`competition-challenge-card ${
        challenge.status === "solved" ? "solved" : ""
      }`}
      onClick={() => onChallengeClick(challenge)}
      style={{ cursor: "pointer" }}
    >
      {/* Header */}
      <div className="challenge-card-header">
        <div
          className="challenge-category-badge"
          style={{ borderColor: displayCategory.color }}
        >
          <span className="category-icon">
            {displayCategory.icon ? createElement(displayCategory.icon, { size: 20 }) : null}
          </span>
          <span className="category-name">{(displayCategory?.name || 'Unknown').toUpperCase()}</span>
        </div>
        <span className={`difficulty-badge difficulty-${challenge.difficulty}`}>
          {challenge.difficulty.toUpperCase()}
        </span>
      </div>

      {/* Title */}
      <h3 className="challenge-card-title">{challenge.title}</h3>

      {/* Points Badge */}
      <div className="challenge-card-points" title={pointsDisplay.tooltipText}>
        <span className="challenge-card-points-value">{pointsDisplay.displayText}</span>
        <span className="challenge-card-points-note">{pointsDisplay.helperText}</span>
      </div>

      {/* Description */}
      <p className="challenge-card-description">{challenge.description}</p>

      {/* Status & Action */}
      <div className="challenge-card-footer">
        {challenge.status === "solved" ? (
          <>
            <div className="solved-status">
              <BiCheckCircle className="solved-icon" />
              <span>SOLVED</span>
            </div>
            <button className="btn btn-ghost btn-sm">View Solution</button>
          </>
        ) : (
          <button className="btn btn-primary btn-block">SOLVE NOW</button>
        )}
      </div>
    </div>
  );
});

ChallengeCard.displayName = 'ChallengeCard';

export default ChallengeCard;
