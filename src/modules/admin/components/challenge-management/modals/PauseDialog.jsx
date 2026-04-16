import React from "react";

const PauseDialog = ({
  closeModal,
  pauseMinutes,
  setPauseMinutes,
  pauseSeconds,
  setPauseSeconds,
  handleConfirmPause,
}) => {
  return (
    <div className="modal-overlay" onClick={() => closeModal("pauseDialog")}>
      <div className="modal-content pause-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Pause Competition</h2>
          <button className="modal-close" onClick={() => closeModal("pauseDialog")}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={(e) => { e.preventDefault(); handleConfirmPause(); }}>
            <label>Pause Duration</label>
            <div className="time-input-group">
              <input
                type="number"
                min="0"
                max="59"
                value={pauseMinutes}
                onChange={(e) => setPauseMinutes(e.target.value)}
                placeholder="Minutes"
                className="time-input"
              />
              <span>:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={pauseSeconds}
                onChange={(e) => setPauseSeconds(e.target.value)}
                placeholder="Seconds"
                className="time-input"
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => closeModal("pauseDialog")}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Confirm Pause
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PauseDialog;
