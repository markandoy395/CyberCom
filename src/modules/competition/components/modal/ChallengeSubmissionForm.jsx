import { memo } from "react";
import { FaCircleCheck, FaCircleXmark, BiFlag, BiHelpCircle } from "../../../../utils/icons";
import ActionButton from "../../../../common/ActionButton";

const ChallengeSubmissionForm = memo(({
  flag,
  onFlagChange,
  submitting,
  resultSuccess,
  attempts,
  maxAttempts,
  isAlreadySolved,
  attemptsExceeded,
  onSubmit,
  isCompetitionDone,
}) => {
  return (
    <div className="modal-section">
      <h3 className="modal-section-title">Submit Flag</h3>
      {isCompetitionDone && (
        <div className="modal-status-alert modal-status-archived">
          <div className="modal-alert-icon">📋</div>
          <div className="modal-alert-text">This competition has ended. Viewing archived challenge.</div>
        </div>
      )}
      {isAlreadySolved && (
        <div className="modal-status-alert modal-status-success">
          <div className="modal-alert-icon"><FaCircleCheck /></div>
          <div className="modal-alert-text">Challenge already solved!</div>
        </div>
      )}
      {attemptsExceeded && !isAlreadySolved && (
        <div className="modal-status-alert modal-status-error">
          <div className="modal-alert-icon"><FaCircleXmark /></div>
          <div className="modal-alert-text">Team attempt limit exceeded!</div>
        </div>
      )}
      {!isAlreadySolved && !attemptsExceeded && !isCompetitionDone && (
        <form onSubmit={onSubmit} className="flag-form">
          <div className="flag-input-group">
            <span className="flag-input-icon"><BiFlag /></span>
            <input
              type="text"
              className="input flag-input"
              placeholder="flag{...}"
              value={flag}
              onChange={(e) => onFlagChange(e.target.value)}
              disabled={submitting || resultSuccess}
            />
            <div className="attempt-reminder" title={`Team attempts: ${attempts}/${maxAttempts}`}>
              <BiHelpCircle className="attempt-icon" />
            </div>
            <ActionButton
              type="submit"
              className="btn btn-primary"
              variant="custom"
              size="custom"
              isLoading={submitting}
              loadingText="Checking"
              disabled={!flag || resultSuccess}
            >
              Submit
            </ActionButton>
          </div>
          <p className="attempts-info">
            Team attempts: <span className={attempts >= maxAttempts * 0.8 ? "text-warning" : ""}>
              {attempts}/{maxAttempts}
            </span>
          </p>
        </form>
      )}
    </div>
  );
});

ChallengeSubmissionForm.displayName = 'ChallengeSubmissionForm';

export default ChallengeSubmissionForm;
