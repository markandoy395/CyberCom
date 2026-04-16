import { useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { FaXmark } from "react-icons/fa6";
import "../challenge-management/ChallengeDetailModal.css";
import "./CompetitionInfoModal.css";

/**
 * Reusable portal modal for competition dashboard widgets
 * (Submission Analytics, Pre-Competition Validation, etc.)
 *
 * Mirrors the lifecycle behavior of ChallengeDetailModal:
 * - Portal-based
 * - ESC closes
 * - Body scroll locked
 * - Backdrop click closes
 */
const CompetitionInfoModal = ({ title, icon, onClose, children }) => {
  const portalElement = useMemo(() => {
    let element = document.getElementById("modal-portal");
    if (!element) {
      element = document.createElement("div");
      element.id = "modal-portal";
      document.body.appendChild(element);
    }
    return element;
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";

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

      if (sidebarToggle) {
        sidebarToggle.style.display = originalDisplay || "";
      }

      window.removeEventListener("keydown", handleEsc);
      window.scrollTo(0, scrollY);
    };
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return ReactDOM.createPortal(
    <div
      className="challenge-detail-modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="challenge-detail-modal competition-info-modal">
        <div className="competition-info-modal-header">
          <div className="competition-info-modal-title">
            {icon && <span className="competition-info-modal-icon">{icon}</span>}
            <h3>{title}</h3>
          </div>
          <button
            className="competition-info-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <FaXmark />
          </button>
        </div>

        <div className="competition-info-modal-body">{children}</div>

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

export default CompetitionInfoModal;
