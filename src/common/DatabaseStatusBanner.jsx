import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  DATABASE_STATUS_EVENT,
  DATABASE_UNAVAILABLE_MESSAGE,
} from "../utils/api";
import "./ActionButton.css";
import "./DatabaseStatusBanner.css";

const hiddenBannerState = {
  isVisible: false,
  message: "",
};

const DatabaseStatusBanner = () => {
  const [bannerState, setBannerState] = useState(hiddenBannerState);

  useEffect(() => {
    const handleDatabaseStatusChange = event => {
      const { available = true, message = "" } = event?.detail || {};

      if (available) {
        setBannerState(hiddenBannerState);
        return;
      }

      setBannerState({
        isVisible: true,
        message: message || DATABASE_UNAVAILABLE_MESSAGE,
      });
    };

    window.addEventListener(DATABASE_STATUS_EVENT, handleDatabaseStatusChange);

    return () => {
      window.removeEventListener(DATABASE_STATUS_EVENT, handleDatabaseStatusChange);
    };
  }, []);

  if (!bannerState.isVisible) {
    return null;
  }

  const bannerContent = (
    <div
      className="database-status-banner"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="database-status-banner__content">
        <span
          className="action-btn-spinner database-status-banner__icon"
          aria-hidden="true"
        >
          {"\u27F3"}
        </span>
        <span className="database-status-banner__message">{bannerState.message}</span>
      </div>
    </div>
  );

  try {
    return ReactDOM.createPortal(bannerContent, document.body);
  } catch (_error) {
    return null;
  }
};

export default DatabaseStatusBanner;
