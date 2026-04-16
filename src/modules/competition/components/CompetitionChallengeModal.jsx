import { useState, useEffect, createElement, useCallback } from "react";
import { FaXmark } from "../../../utils/icons";
import { CATEGORIES } from "../../../utils/constants";
import NotificationModal from "../../../common/NotificationModal";
import ChallengeHints from "./modal/ChallengeHints";
import ChallengeResources from "./modal/ChallengeResources";
import ChallengeSubmissionForm from "./modal/ChallengeSubmissionForm";
import { useSubmission } from "../hooks/useSubmission";
import {
  formatCompetitionPoints,
  getScoringExplanation,
} from "../utils/scoringUtils";
import "./CompetitionChallengeModal.css";

const CompetitionChallengeModal = ({
  challenge,
  onClose,
  competitionStatus,
  competitionScoring,
}) => {
  const [selectedHintIndex, setSelectedHintIndex] = useState(null);
  const {
    flag,
    setFlag,
    submitting,
    result,
    setResult,
    wasSolved,
    attempts,
    loadAttemptSummary,
    handleSubmit,
    attemptsExceeded,
    maxAttempts,
  } = useSubmission();

  const category = typeof challenge.category === 'object' 
    ? { ...challenge.category, icon: CATEGORIES.find(c => c.id === challenge.category.id)?.icon }
    : CATEGORIES.find((cat) => cat.id === challenge.category);
  const isAlreadySolved = challenge.status === "solved";
  const isCompetitionDone = competitionStatus === 'done';
  const pointsDisplay = formatCompetitionPoints(challenge.points, {
    solverCount: challenge.solverCount,
    attempts: Math.max(attempts, 0) + 1,
    isSolved: isAlreadySolved,
    competitionStartDate: competitionScoring?.startDate,
    competitionEndDate: competitionScoring?.endDate,
    scoringSettings: competitionScoring?.scoringSettings,
  });

  // Cleanup on unmount and ESC key
  useEffect(() => {
    loadAttemptSummary(challenge.id);
  }, [challenge.id, loadAttemptSummary]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose(challenge.id, wasSolved);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "auto";
    };
  }, [onClose, challenge.id, wasSolved]);

  const handleChallengeClick = (e) => {
    e.stopPropagation();
  };

  const handleCloseClick = (e) => {
    e.stopPropagation();
    onClose(challenge.id, wasSolved);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose(challenge.id, wasSolved);
    }
  };

  const handleFormSubmit = (e) => {
    handleSubmit(e, challenge.id, null, false);
  };



  // Stable callback for dismissing notifications
  const handleDismissNotification = useCallback(() => {
    setResult(null);
  }, []);

  return (
    <div className="challenge-modal-backdrop" onClick={handleBackdropClick}>
      <NotificationModal
        notification={result}
        onDismiss={handleDismissNotification}
        duration={3000}
      />

      <div 
        className={`challenge-modal ${isAlreadySolved ? "challenge-solved" : ""}`} 
        onClick={handleChallengeClick}
      >
        {/* Top Bar: Category, Difficulty Badge & Close Button */}
        <div className="modal-top-bar">
          <div className="modal-category">
            <span className="modal-category-icon">
              {category?.icon ? createElement(category.icon, { size: 18 }) : null}
            </span>
            <span className="modal-category-name">{category?.name}</span>
          </div>
          <div className="modal-top-right">
            <span className={`modal-difficulty modal-difficulty-${challenge.difficulty}`}>
              {challenge.difficulty.toUpperCase()}
            </span>
            <button
              type="button"
              className="modal-close-btn competition-modal-close-btn"
              onClick={handleCloseClick}
              aria-label="Close challenge modal"
              title="Close"
            >
              <FaXmark />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <h1 className="modal-title">{challenge.title}</h1>
        <p className="modal-description">{challenge.fullDescription || challenge.description}</p>

        {/* Points */}
        {challenge.points && (
          <>
            <div className="modal-points">
              <span className="points-label">
                {isAlreadySolved || !pointsDisplay.projectedScore ? "MAX POINTS:" : "LIVE SCORE NOW:"}
              </span>
              <span className="points-value">
                {isAlreadySolved ? challenge.points : pointsDisplay.displayText}
              </span>
            </div>
            <div
              className="competition-points-explanation"
              title={getScoringExplanation()}
            >
              {pointsDisplay.helperText}
            </div>
          </>
        )}

        {/* Hints and Resources Side-by-Side */}
        <div className="modal-hints-resources-container">
          <ChallengeHints
            hints={challenge.hints}
            selectedHintIndex={selectedHintIndex}
            onSelectHint={(index) => setSelectedHintIndex(selectedHintIndex === index ? null : index)}
          />

          <ChallengeResources attachments={challenge.attachments || []} />
        </div>

        {/* Submission Form */}
        <ChallengeSubmissionForm
          flag={flag}
          onFlagChange={setFlag}
          submitting={submitting}
          resultSuccess={result?.success}
          attempts={attempts}
          maxAttempts={maxAttempts}
          isAlreadySolved={isAlreadySolved || wasSolved}
          attemptsExceeded={attemptsExceeded}
          onSubmit={handleFormSubmit}
          isCompetitionDone={isCompetitionDone}
        />
      </div>
    </div>
  );
};

export default CompetitionChallengeModal;
