import { useState } from "react";
import { FaChartLine, FaShieldHalved, FaBolt } from "react-icons/fa6";
import {
  CompetitionDashboardHeader,
  CompetitionInfoModal,
  PreCompetitionChecklist,
  SubmissionStats,
} from "../../../components/competition-dashboard";
import {
  CompetitionGrid,
  useCompetitionStartValidation,
} from "../../../competition-management";
import "./CompetitionsTab.css";

const CompetitionsTab = ({
  competitions,
  handleStartCompetition,
  handlePauseCompetition,
  handleDoneCompetition,
  handleCancelCompetition,
  formatTime,
  pauseTimeRemaining,
  openModal,
  showResult,
}) => {
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [checklistCompetition, setChecklistCompetition] = useState(null);
  const {
    activeCompetition,
    handleStartClick,
    hasActiveCompetition,
    manageableCompetitions,
    startValidationsByCompetitionId,
    startingCompetitionId,
    validationMessages,
  } = useCompetitionStartValidation({
    competitions,
    handleStartCompetition,
    onOpenChecklist: setChecklistCompetition,
    showResult,
  });

  const isCreateDisabled = competitions?.some(
    (comp) => comp.status === "active" || comp.status === "upcoming"
  );

  return (
    <div className="admin-section">
      <div className="section-header">
        <div className="header-content">
          <h3>Competition Management</h3>
          <p className="section-subtitle">Prepare, validate, start, and monitor competitions</p>
        </div>
        <button
          className={`btn-primary ${isCreateDisabled ? "btn-disabled" : ""}`}
          onClick={() => {
            if (!isCreateDisabled) openModal?.("createCompetition");
          }}
          disabled={isCreateDisabled}
          title={isCreateDisabled ? "Cannot create while a competition is active or upcoming" : "Create a new competition"}
          type="button"
        >
          <FaBolt /> Create Competition
        </button>
      </div>

      {activeCompetition && (
        <div className="active-competition-dashboard">
          <div className="dashboard-header-section">
            <CompetitionDashboardHeader
              competition={activeCompetition}
              formatTime={formatTime}
            />
          </div>

          <div className="dashboard-info-buttons">
            <button
              className="dashboard-info-btn"
              onClick={() => setShowStatsModal(true)}
              type="button"
            >
              <span className="dashboard-info-btn-icon analytics"><FaChartLine /></span>
              <span className="dashboard-info-btn-text">
                <span className="dashboard-info-btn-title">Submission Analytics</span>
                <span className="dashboard-info-btn-subtitle">View live submission stats</span>
              </span>
            </button>

            <button
              className="dashboard-info-btn"
              onClick={() => setChecklistCompetition(activeCompetition)}
              type="button"
            >
              <span className="dashboard-info-btn-icon checklist"><FaShieldHalved /></span>
              <span className="dashboard-info-btn-text">
                <span className="dashboard-info-btn-title">Pre-Competition Validation</span>
                <span className="dashboard-info-btn-subtitle">Review start requirements</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {showStatsModal && activeCompetition && (
        <CompetitionInfoModal
          icon={<FaChartLine />}
          onClose={() => setShowStatsModal(false)}
          title="Submission Analytics"
        >
          <SubmissionStats competitionId={activeCompetition.id} />
        </CompetitionInfoModal>
      )}

      {checklistCompetition && (
        <CompetitionInfoModal
          icon={<FaShieldHalved />}
          onClose={() => setChecklistCompetition(null)}
          title={`Pre-Competition Validation: ${checklistCompetition.name}`}
        >
          <PreCompetitionChecklist competition={checklistCompetition} />
        </CompetitionInfoModal>
      )}

      <CompetitionGrid
        formatTime={formatTime}
        hasActiveCompetition={hasActiveCompetition}
        manageableCompetitions={manageableCompetitions}
        onCancelCompetition={handleCancelCompetition}
        onDoneCompetition={handleDoneCompetition}
        onOpenChecklist={setChecklistCompetition}
        onPauseCompetition={handlePauseCompetition}
        onStartCompetition={handleStartClick}
        pauseTimeRemaining={pauseTimeRemaining}
        startValidationsByCompetitionId={startValidationsByCompetitionId}
        startingCompetitionId={startingCompetitionId}
        validationMessages={validationMessages}
      />
    </div>
  );
};

export default CompetitionsTab;
