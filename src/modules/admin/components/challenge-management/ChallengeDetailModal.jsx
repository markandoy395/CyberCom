import { useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import ChallengeDetailHeader from "./ChallengeDetailHeader";
import ChallengeDetailBody from "./ChallengeDetailBody";
import "./ChallengeDetailModal.css";

/**
 * Challenge Detail Modal - Portal-based wrapper for challenge details
 * Handles: portal lifecycle, body scroll prevention, ESC key handling
 */
const ChallengeDetailModal = ({ challenge, onClose, onEdit, onDelete, onMaintenance, onRemove, removeTitle }) => {
  // Initialize portal element with useMemo
  const portalElement = useMemo(() => {
    let element = document.getElementById("modal-portal");
    if (!element) {
      element = document.createElement("div");
      element.id = "modal-portal";
      document.body.appendChild(element);
    }
    return element;
  }, []);

  // Close on ESC key and prevent body scroll
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Store scroll position and prevent scroll
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    
    // Hide sidebar toggle button
    const sidebarToggle = document.querySelector(".sidebar-toggle-btn");
    let originalDisplay = "";
    if (sidebarToggle) {
      originalDisplay = sidebarToggle.style.display;
      sidebarToggle.style.display = "none";
    }
    
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "auto";
      document.body.style.position = "static";
      document.body.style.width = "auto";
      
      // Show sidebar toggle button again
      if (sidebarToggle) {
        sidebarToggle.style.display = originalDisplay || "";
      }
      
      window.removeEventListener("keydown", handleEsc);
      window.scrollTo(0, scrollY);
    };
  }, [onClose]);

  // Close when clicking backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return ReactDOM.createPortal(
    <div className="challenge-detail-modal-backdrop" onClick={handleBackdropClick}>
      <div className="challenge-detail-modal">
        {/* Header with category, difficulty, and action buttons */}
        <ChallengeDetailHeader 
          challenge={challenge}
          onClose={onClose}
          onEdit={onEdit}
          onDelete={onDelete}
          onMaintenance={onMaintenance}
          onRemove={onRemove}
          removeTitle={removeTitle}
        />

        {/* Title */}
        <div className="modal-title-section">
          <h2 className="modal-title">{challenge.title}</h2>
        </div>

        {/* Body with description, flag, hints, resources */}
        <ChallengeDetailBody challenge={challenge} />

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default ChallengeDetailModal;
