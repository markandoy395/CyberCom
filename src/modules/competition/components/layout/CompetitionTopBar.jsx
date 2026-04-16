import { BiTrophy } from "../../../../utils/icons";
import "./CompetitionTopBar.css";

const CompetitionTopBar = ({ data, onExit, isSystemLocked = false }) => {
  const normalizedCompetitionStatus = typeof data?.competitionStatus === "string"
    ? data.competitionStatus.trim().toLowerCase()
    : "";
  const competitionStatusLabel = normalizedCompetitionStatus === "paused"
    ? "COMPETITION PAUSED"
    : normalizedCompetitionStatus === "done"
      ? "COMPETITION FINISHED"
      : "LIVE COMPETITION";

  const handleOpenGitBash = async () => {
    try {
      const response = await fetch("/api/open-powershell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (result.success) {
        alert("Git Bash is opening...");
      } else {
        alert(`Error: ${result.error || "Could not open Git Bash"}`);
      }
    } catch (error) {
      alert(`Error opening Git Bash: ${error.message}`);
    }
  };

  return (
    <div className="competition-topbar">
      <div className="topbar-container">
        <div className="topbar-left">
          <div className="competition-status">
            <span className="status-icon pulsing">
              <BiTrophy size={24} />
            </span>
            <span className="status-text">{competitionStatusLabel}</span>
          </div>
          <div className="competition-info">
            {data.competitionName && (
              <div className="competition-name">
                <span className="comp-label">Competition:</span>
                <span className="comp-value">{data.competitionName}</span>
              </div>
            )}
            <div className="team-name">
              <span className="team-label">Team:</span>
              <span className="team-value">{data.teamName}</span>
            </div>
            {data.username && (
              <div className="user-name">
                <span className="user-label">User:</span>
                <span className="user-value">{data.username}</span>
              </div>
            )}
          </div>
        </div>

        <div className="topbar-right">
          <button
            type="button"
            className="powershell-button"
            onClick={handleOpenGitBash}
            title="Open Git Bash Terminal"
            disabled={isSystemLocked}
          >
            <span style={{ marginRight: "6px", fontSize: "16px" }}>{">_"}</span>
            <span>Git Bash</span>
          </button>
          <button type="button" className="exit-button" onClick={onExit}>
            <span>Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompetitionTopBar;
