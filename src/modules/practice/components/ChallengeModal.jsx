import { useState, useEffect, useRef, createElement, useCallback } from "react";
import { FaCircleCheck, FaXmark, BiFlag, FaLink } from "../../../utils/icons";
import { CATEGORIES } from "../../../utils/constants";
import { encryptedFetch } from "../../../utils/encryption";
import { downloadFile } from "../../../utils/helpers";
import NotificationModal from "../../../common/NotificationModal";
import ActionButton from "../../../common/ActionButton";
import "./ChallengeModal.css";

const ChallengeModal = ({ challenge, onClose }) => {
  const [flag, setFlag] = useState("");
  const [selectedHintIndex, setSelectedHintIndex] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [wasSolved, setWasSolved] = useState(false);
  
  // Prevent multiple rapid submissions - using ref for stronger protection
  const isSubmittingRef = useRef(false);
  const lastSubmitTimeRef = useRef(0);
  const MIN_SUBMIT_DELAY = 500; // Minimum 500ms between submissions

  const category = CATEGORIES.find((cat) => cat.id === challenge.category);
  const isAlreadySolved = challenge.status === "solved";
  const isSubmissionLocked = submitting || wasSolved;

  // Cleanup on unmount and ESC key
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



  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple rapid submissions
    const now = Date.now();
    if (isSubmittingRef.current) {
      // Already submitting, ignore this click
      return;
    }
    if (now - lastSubmitTimeRef.current < MIN_SUBMIT_DELAY) {
      // Too soon since last submission attempt, ignore
      return;
    }
    
    // Mark submission as in progress
    isSubmittingRef.current = true;
    lastSubmitTimeRef.current = now;
    setSubmitting(true);

    try {
      // Get user ID from localStorage
      const userSession = localStorage.getItem('userSession');
      const userId = userSession ? JSON.parse(userSession).user_id : 'anonymous';
      
      // Prepare submission payload - ID is NOT encrypted, only flag data
      const submissionPayload = {
        user_id: userId,
        challenge_id: challenge.id,
        flag: flag.trim()
      };

      // Submit encrypted flag to API
      const response = await encryptedFetch('/api/submissions', {
        method: 'POST',
        body: JSON.stringify(submissionPayload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Correct flag
        setNotification({
          type: 'success',
          title: 'Success!',
          message: "Correct! Challenge solved!",
        });

        setWasSolved(true);
        
        // Close modal after showing success message
        setTimeout(() => {
          setNotification(null);
          setFlag("");
          onClose(challenge.id, true);
        }, 1500);
      } else {
        // Incorrect flag or API error
        setNotification({
          type: 'error',
          title: 'Error',
          message: data.is_correct === false 
            ? "Incorrect flag. Try again!" 
            : (data.error || "Submission failed. Try again!"),
        });
      }
    } catch (_error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: "Error submitting flag. Please try again.",
      });
    } finally {
      // Mark submission as complete
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target.className === "challenge-modal-backdrop") {
      // Backdrop click always closes
      onClose(challenge.id, false);
    }
  };

  const handleCloseClick = () => {
    // X button always closes the modal (not a solve action)
    onClose(challenge.id, false);
  };

  // Stable callback for dismissing notifications
  const handleDismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return (
    <div className="challenge-modal-backdrop" onClick={handleBackdropClick}>
      {/* Global Result Alert */}
      <NotificationModal
        notification={notification}
        onDismiss={handleDismissNotification}
        duration={3000}
      />

      <div className={`challenge-modal ${isAlreadySolved ? "challenge-solved" : ""}`}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={handleCloseClick}>
          <FaXmark />
        </button>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-category">
            <span className="modal-category-icon">{category?.icon ? createElement(category.icon, { size: 20 }) : null}</span>
            <span className="modal-category-name">{category?.name}</span>
          </div>
          <span
            className={`difficulty-badge difficulty-${challenge.difficulty}`}
          >
            {challenge.difficulty}
          </span>
        </div>

        {/* Title */}
        <h2 className="modal-title">{challenge.title}</h2>

        {/* Description */}
        <div className="modal-section">
          <h3 className="modal-section-title">Description</h3>
          <p className="modal-description">{challenge.description}</p>
          {challenge.fullDescription && (
            <p className="modal-description">{challenge.fullDescription}</p>
          )}
        </div>

        {/* Hints and Resources - One Row */}
        <div className="modal-info-container">
          {/* Hints */}
          {challenge.hints && challenge.hints.length > 0 && (
            <div className="modal-subsection">
              <h3 className="modal-section-title">Hints</h3>
              <div className="hints-buttons">
                {challenge.hints.map((hint, index) => (
                  <button
                    key={index}
                    className={`hint-btn ${selectedHintIndex === index ? "hint-btn-active" : ""}`}
                    onClick={() => setSelectedHintIndex(selectedHintIndex === index ? null : index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="hint-display-area">
                {selectedHintIndex !== null && (
                  <div className="modal-hint">
                    <p className="hint-text">
                      {selectedHintIndex + 1}. {challenge.hints[selectedHintIndex]}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resources */}
          {challenge.attachment && (
            <div className="modal-subsection">
              <h3 className="modal-section-title">Resources</h3>
              {challenge.attachment.type === "file" && (
                <button 
                  onClick={() => downloadFile(challenge.attachment.url, challenge.attachment.name)}
                  className="modal-file modal-download-btn"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                >
                  📎 {challenge.attachment.name}
                </button>
              )}
              {challenge.attachment.type === "link" && (
                <a href={challenge.attachment.url} className="modal-link" target="_blank" rel="noopener noreferrer">
                  <FaLink size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {challenge.attachment.name}
                </a>
              )}
              {challenge.attachment.type === "image" && (
                <div className="modal-image-container">
                  <button 
                    onClick={() => downloadFile(challenge.attachment.url, challenge.attachment.name)}
                    className="modal-download-btn"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <img src={challenge.attachment.url} alt={challenge.attachment.name} className="modal-image" />
                  </button>
                  {challenge.attachment.name && <p className="modal-image-caption">{challenge.attachment.name}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Flag Submission */}
        <div className="modal-section">
          <h3 className="modal-section-title">Submit Flag</h3>
          {isAlreadySolved && (
            <div className="modal-status-alert modal-status-success">
              <div className="modal-alert-icon"><FaCircleCheck /></div>
              <div className="modal-alert-text">Challenge already solved!</div>
            </div>
          )}
          {!isAlreadySolved && (
            <form onSubmit={handleSubmit} className="flag-form">
              <div className="flag-input-group">
                <span className="flag-input-icon"><BiFlag /></span>
                <input
                  type="text"
                  className="input flag-input"
                  placeholder="flag{...}"
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  disabled={isSubmissionLocked}
                />
                <ActionButton
                  type="submit"
                  className="btn btn-primary"
                  variant="custom"
                  size="custom"
                  isLoading={submitting}
                  loadingText="Checking"
                  disabled={!flag || wasSolved}
                >
                  Submit
                </ActionButton>
              </div>
            </form>
          )}
        </div>

        {/* Tags */}
        {challenge.tags && challenge.tags.length > 0 && (
          <div className="modal-tags">
            {challenge.tags.map((tag, index) => (
              <span key={index} className="modal-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallengeModal;
