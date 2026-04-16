import { memo } from "react";

const ChallengeHints = memo(({ hints, selectedHintIndex, onSelectHint }) => {
  return (
    <div className="modal-section">
      <h3 className="modal-section-title">Hints</h3>
      <div className="hints-buttons">
        {hints && hints.length > 0 ? (
          hints.map((hint, index) => (
            <button
              key={index}
              className={`hint-btn ${selectedHintIndex === index ? "hint-btn-active" : ""}`}
              onClick={() => onSelectHint(selectedHintIndex === index ? null : index)}
            >
              {index + 1}
            </button>
          ))
        ) : (
          <p className="no-hints">No hints available</p>
        )}
      </div>
      <div className="hint-display-area">
        {selectedHintIndex !== null && hints && hints[selectedHintIndex] && (
          <div className="modal-hint">
            <p className="hint-text">
              {selectedHintIndex + 1}. {hints[selectedHintIndex]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

ChallengeHints.displayName = 'ChallengeHints';

export default ChallengeHints;
