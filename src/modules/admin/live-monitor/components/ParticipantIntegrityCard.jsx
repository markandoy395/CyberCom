import { memo } from "react";
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiShield,
  FiTarget,
  FiXCircle,
} from "react-icons/fi";

const categoryColors = {
  web: { bg: "rgba(2, 132, 199, 0.08)", text: "#0284c7", border: "rgba(2, 132, 199, 0.20)" },
  crypto: { bg: "rgba(217, 119, 6, 0.08)", text: "#d97706", border: "rgba(217, 119, 6, 0.20)" },
  forensics: { bg: "rgba(5, 150, 105, 0.08)", text: "#059669", border: "rgba(5, 150, 105, 0.20)" },
  reverse: { bg: "rgba(220, 38, 38, 0.08)", text: "#dc2626", border: "rgba(220, 38, 38, 0.20)" },
  binary: { bg: "rgba(37, 99, 235, 0.08)", text: "#2563eb", border: "rgba(37, 99, 235, 0.20)" },
  misc: { bg: "rgba(124, 58, 237, 0.08)", text: "#7c3aed", border: "rgba(124, 58, 237, 0.20)" },
};

const difficultyColors = {
  easy: { bg: "rgba(5, 150, 105, 0.08)", text: "#059669", border: "rgba(5, 150, 105, 0.20)" },
  medium: { bg: "rgba(217, 119, 6, 0.08)", text: "#d97706", border: "rgba(217, 119, 6, 0.20)" },
  hard: { bg: "rgba(220, 38, 38, 0.08)", text: "#dc2626", border: "rgba(220, 38, 38, 0.20)" },
};

const riskStyles = {
  normal: { label: "Normal", colorClass: "normal", barColor: "#059669" },
  watch: { label: "Watch", colorClass: "watch", barColor: "#b45309" },
  monitor: { label: "Monitor", colorClass: "monitor", barColor: "#d97706" },
  "high-risk": { label: "High Risk", colorClass: "high-risk", barColor: "#dc2626" },
};

function formatTime(seconds) {
  if (seconds == null) return "N/A";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function titleCase(value) {
  return String(value || "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

const defaultRiskAssessment = {
  score: 0,
  statusKey: "normal",
  statusLabel: "Normal",
  monitorRecommended: false,
  reasons: [],
  metrics: {},
  primaryChallenge: null,
  topChallenges: [],
};

const getRenderSignature = participant => {
  const riskAssessment = participant?.riskAssessment || defaultRiskAssessment;
  const primaryChallenge = riskAssessment.primaryChallenge || {};
  const topChallenges = Array.isArray(riskAssessment.topChallenges)
    ? riskAssessment.topChallenges
    : [];
  const metrics = riskAssessment.metrics || {};
  const viewingChallengeData = participant?.viewingChallengeData || {};

  return JSON.stringify({
    id: participant?.teamMemberId || participant?.id || null,
    username: participant?.username || "",
    teamName: participant?.teamName || "",
    status: participant?.status || "",
    currentChallenge: participant?.currentChallenge || "",
    viewingChallengeTitle: viewingChallengeData.title || "",
    viewingChallengeCategory: viewingChallengeData.category || "",
    viewingChallengeDifficulty: viewingChallengeData.difficulty || "",
    score: riskAssessment.score || 0,
    statusKey: riskAssessment.statusKey || "normal",
    statusLabel: riskAssessment.statusLabel || "Normal",
    monitorRecommended: Boolean(riskAssessment.monitorRecommended),
    reasons: riskAssessment.reasons || [],
    primaryChallenge: {
      title: primaryChallenge.title || "",
      categoryKey: primaryChallenge.categoryKey || "",
      categoryName: primaryChallenge.categoryName || "",
      difficulty: primaryChallenge.difficulty || "",
      timeToFirstCorrectSeconds: primaryChallenge.timeToFirstCorrectSeconds ?? null,
      attemptsBeforeCorrect: primaryChallenge.attemptsBeforeCorrect ?? null,
      focusLossCount: primaryChallenge.focusLossCount || 0,
      tabHiddenCount: primaryChallenge.tabHiddenCount || 0,
      copyCount: primaryChallenge.copyCount || 0,
      pasteCount: primaryChallenge.pasteCount || 0,
      reopenCount: primaryChallenge.reopenCount || 0,
    },
    topChallenges: topChallenges.map(challenge => ({
      challengeId: challenge.challengeId || null,
      title: challenge.title || "",
      difficulty: challenge.difficulty || "",
      score: challenge.score || 0,
      monitorRecommended: Boolean(challenge.monitorRecommended),
      expectedSolveMinutes: challenge.expectedSolveMinutes || 0,
      timeToFirstCorrectSeconds: challenge.timeToFirstCorrectSeconds ?? null,
      attemptsBeforeCorrect: challenge.attemptsBeforeCorrect ?? null,
    })),
    metrics: {
      suspiciousFastSolves: metrics.suspiciousFastSolves || 0,
      firstTryAdvancedSolves: metrics.firstTryAdvancedSolves || 0,
      pasteBeforeCorrectSolves: metrics.pasteBeforeCorrectSolves || 0,
      tabSwitchHeavySolves: metrics.tabSwitchHeavySolves || 0,
    },
  });
};

const ParticipantIntegrityCard = ({ participant, onOpenViewer }) => {
  const riskAssessment = participant.riskAssessment || defaultRiskAssessment;
  const risk = riskStyles[riskAssessment.statusKey] || riskStyles.normal;
  const reasons = riskAssessment.reasons || [];
  const monitorRecommended = Boolean(riskAssessment.monitorRecommended);
  const metrics = riskAssessment.metrics || {};
  const topChallenges = Array.isArray(riskAssessment.topChallenges)
    ? riskAssessment.topChallenges
    : [];
  const primaryChallenge = riskAssessment.primaryChallenge || topChallenges[0] || null;
  const fallbackChallenge = participant.viewingChallengeData || null;
  const totalAuditedChallenges = Math.max(
    metrics.totalAuditedChallenges || 0,
    topChallenges.length
  );
  const displayedTopChallenges = topChallenges.slice(0, 3);
  const remainingAuditedChallenges = Math.max(
    totalAuditedChallenges - displayedTopChallenges.length,
    0
  );

  const challengeName = (
    primaryChallenge?.title
    || fallbackChallenge?.title
    || participant.currentChallenge
    || "No challenge in focus"
  );
  const challengeCategoryKey = primaryChallenge?.categoryKey || fallbackChallenge?.category || "misc";
  const challengeCategoryLabel = titleCase(
    primaryChallenge?.categoryName || fallbackChallenge?.category || challengeCategoryKey
  );
  const challengeDifficulty = primaryChallenge?.difficulty || fallbackChallenge?.difficulty || null;
  const challengeContextLabel = primaryChallenge
    ? (
        totalAuditedChallenges > 1
          ? `Most suspicious of ${totalAuditedChallenges} audited challenges`
          : "Single audited challenge"
      )
    : fallbackChallenge
      ? "Current challenge in focus"
      : "No monitored challenge yet";

  const solveTimeSeconds = primaryChallenge?.timeToFirstCorrectSeconds ?? null;
  const expectedSolveMinutes = primaryChallenge?.expectedSolveMinutes ?? null;
  const expectedSolveTimeSeconds = expectedSolveMinutes == null
    ? null
    : Math.round(expectedSolveMinutes * 60);
  const attemptsBeforeCorrect = primaryChallenge?.attemptsBeforeCorrect ?? null;
  const solveRatio = (
    solveTimeSeconds != null
    && expectedSolveTimeSeconds
  )
    ? solveTimeSeconds / expectedSolveTimeSeconds
    : null;
  const expectedSolveLabel = expectedSolveTimeSeconds
    ? `Expected ${formatTime(expectedSolveTimeSeconds)}`
    : null;
  const solveRatioLabel = solveRatio !== null
    ? (
        solveRatio <= 0.35
          ? `${Math.round(solveRatio * 100)}% of expected`
          : `${Math.round(solveRatio * 100)}% of expected pace`
      )
    : null;
  const challengeSignals = [
    primaryChallenge?.pasteCount ? `${primaryChallenge.pasteCount} paste` : null,
    primaryChallenge?.copyCount ? `${primaryChallenge.copyCount} copy` : null,
    primaryChallenge?.focusLossCount ? `${primaryChallenge.focusLossCount} focus loss` : null,
    primaryChallenge?.tabHiddenCount ? `${primaryChallenge.tabHiddenCount} tab hide` : null,
    primaryChallenge?.reopenCount ? `${primaryChallenge.reopenCount} reopen` : null,
  ].filter(Boolean);
  const aggregateSignals = [
    metrics.suspiciousFastSolves ? `${metrics.suspiciousFastSolves} fast solve` : null,
    metrics.firstTryAdvancedSolves ? `${metrics.firstTryAdvancedSolves} first try` : null,
    metrics.pasteBeforeCorrectSolves ? `${metrics.pasteBeforeCorrectSolves} paste-before-correct` : null,
    metrics.tabSwitchHeavySolves ? `${metrics.tabSwitchHeavySolves} tab-switch heavy` : null,
  ].filter(Boolean);
  const displayedSignals = challengeSignals.length > 0 ? challengeSignals : aggregateSignals;

  const categoryColor = categoryColors[challengeCategoryKey] || categoryColors.misc;
  const difficultyColor = challengeDifficulty
    ? difficultyColors[challengeDifficulty] || difficultyColors.medium
    : null;
  const status = participant.status || "active";
  const displayName = participant.username || "Unknown";

  return (
    <div className="integrity-card">
      <div className={`integrity-card-accent accent-${risk.colorClass}`} />

      <div className="integrity-card-header">
        <div className="integrity-card-identity">
          <div className="integrity-card-avatar-wrap">
            <div className="integrity-card-avatar">
              {displayName[0]?.toUpperCase() || "?"}
            </div>
            {monitorRecommended && (
              <div className="integrity-card-monitor-badge">
                <FiEye size={10} />
              </div>
            )}
          </div>
          <div className="integrity-card-name-block">
            <h4 className="integrity-card-name">{displayName}</h4>
            <p className="integrity-card-id">
              {participant.teamName || `ID: ${participant.teamMemberId || participant.id}`}
            </p>
          </div>
        </div>
        <span className={`integrity-risk-badge risk-${risk.colorClass}`}>
          {riskAssessment.statusLabel || risk.label}
        </span>
      </div>

      <div className="integrity-card-challenge">
        <p className="integrity-card-challenge-note">{challengeContextLabel}</p>
        <div className="integrity-card-challenge-title">
          <FiTarget size={14} />
          <span>{challengeName}</span>
        </div>
        <div className="integrity-card-badges">
          <span
            className="integrity-badge"
            style={{
              background: categoryColor.bg,
              color: categoryColor.text,
              borderColor: categoryColor.border,
            }}
          >
            {challengeCategoryLabel}
          </span>
          {difficultyColor && (
            <span
              className="integrity-badge"
              style={{
                background: difficultyColor.bg,
                color: difficultyColor.text,
                borderColor: difficultyColor.border,
              }}
            >
              {titleCase(challengeDifficulty)}
            </span>
          )}
        </div>
        {displayedTopChallenges.length > 1 && (
          <div className="integrity-card-challenge-list">
            <p className="integrity-card-challenge-list-title">Monitored Challenges</p>
            <div className="integrity-card-challenge-list-items">
              {displayedTopChallenges.map((challenge, index) => (
                <div
                  key={`${participant.teamMemberId || participant.id}-challenge-${challenge.challengeId || index}`}
                  className={`integrity-card-challenge-pill ${
                    index === 0 ? "primary" : ""
                  }`}
                >
                  <div
                    className="integrity-card-challenge-pill-fill"
                    style={{ width: `${challenge.score || 0}%` }}
                  />
                  <div className="integrity-card-challenge-pill-head">
                    <span className="integrity-card-challenge-pill-name">
                      {index + 1}. {challenge.title}
                    </span>
                    <span className="integrity-card-challenge-pill-score">
                      {challenge.score || 0}%
                    </span>
                  </div>
                  <div className="integrity-card-challenge-pill-meta">
                    <span>
                      Solve {formatTime(challenge.timeToFirstCorrectSeconds)}
                    </span>
                    <span>
                      Attempts {challenge.attemptsBeforeCorrect == null ? "N/A" : challenge.attemptsBeforeCorrect}
                    </span>
                  </div>
                </div>
              ))}
              {remainingAuditedChallenges > 0 && (
                <span className="integrity-card-challenge-pill more">
                  +{remainingAuditedChallenges} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="integrity-card-metrics">
        <div className="integrity-metric-box">
          <div className="integrity-metric-label">
            <FiClock size={13} />
            <span>Solve Time</span>
          </div>
          <p className="integrity-metric-value">{formatTime(solveTimeSeconds)}</p>
          {expectedSolveLabel ? (
            <p className="integrity-metric-sub">{expectedSolveLabel}</p>
          ) : null}
          {solveRatioLabel ? (
            <p className={`integrity-metric-sub ${solveRatio <= 0.35 ? "danger" : ""}`}>
              {solveRatioLabel}
            </p>
          ) : !expectedSolveTimeSeconds ? (
            <p className="integrity-metric-sub">Waiting for a correct solve</p>
          ) : null}
        </div>
        <div className="integrity-metric-box">
          <div className="integrity-metric-label">
            <FiActivity size={13} />
            <span>Attempts</span>
          </div>
          <p className="integrity-metric-value">
            {attemptsBeforeCorrect == null ? "N/A" : attemptsBeforeCorrect}
          </p>
          <p className="integrity-metric-sub">
            {attemptsBeforeCorrect == null ? "No solved challenge yet" : "before correct"}
          </p>
        </div>
      </div>

      {displayedSignals.length > 0 && (
        <div className="integrity-card-signals">
          {displayedSignals.slice(0, 5).map(signal => (
            <span
              key={`${participant.teamMemberId || participant.id}-${signal}`}
              className="integrity-signal-chip"
            >
              {signal}
            </span>
          ))}
        </div>
      )}

      <div className="integrity-card-suspicion">
        <div className="integrity-suspicion-header">
          <span className="integrity-suspicion-label">Suspicion Score</span>
          <span className={`integrity-suspicion-value risk-text-${risk.colorClass}`}>
            {riskAssessment.score || 0}%
          </span>
        </div>
        <div className="integrity-suspicion-bar-track">
          <div
            className="integrity-suspicion-bar-fill"
            style={{ width: `${riskAssessment.score || 0}%`, background: risk.barColor }}
          />
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="integrity-card-flags">
          <div className="integrity-flags-title">
            <FiAlertTriangle size={14} />
            <span>Reasons</span>
          </div>
          <div className="integrity-flags-list">
            {reasons.map((reason, index) => (
              <span
                key={`${participant.teamMemberId || participant.id}-reason-${index}`}
                className="integrity-flag-badge"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="integrity-card-footer">
        <div className="integrity-card-status">
          {status === "completed" || status === "idle" ? (
            <div className="integrity-status-indicator status-completed">
              <FiCheckCircle size={14} />
              <span>{status === "completed" ? "Completed" : "Idle"}</span>
            </div>
          ) : status === "flagged" ? (
            <div className="integrity-status-indicator status-flagged">
              <FiXCircle size={14} />
              <span>Flagged</span>
            </div>
          ) : (
            <div className="integrity-status-indicator status-active">
              <FiActivity size={14} />
              <span>{status === "solving" ? "Solving" : "Active"}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className={`integrity-monitor-btn ${monitorRecommended ? "recommended" : ""}`}
          onClick={() => onOpenViewer?.(participant)}
        >
          <FiShield size={13} />
          {monitorRecommended ? "Monitor This Participant" : "Normal Observation"}
        </button>
      </div>
    </div>
  );
};

export default memo(
  ParticipantIntegrityCard,
  (previousProps, nextProps) => (
    getRenderSignature(previousProps.participant) === getRenderSignature(nextProps.participant)
  )
);
