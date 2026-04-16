import React, { useEffect, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiClipboard,
  FiInfo,
  FiXCircle,
} from "react-icons/fi";
import {
  PRE_COMPETITION_VALIDATION_RULES,
  fetchPreCompetitionValidation,
} from "./preCompetitionValidation";
import "./PreCompetitionChecklist.css";

const PreCompetitionChecklist = ({ competition }) => {
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedItems, setCompletedItems] = useState({});
  const validationTarget = useMemo(() => {
    if (!competition?.id) {
      return null;
    }

    return {
      id: competition.id,
      startDate: competition.startDate,
      endDate: competition.endDate,
      maxParticipants: competition.maxParticipants,
      description: competition.description,
      challengeCount: competition.challengeCount,
      teamCount: competition.teamCount,
      status: competition.status,
    };
  }, [
    competition?.id,
    competition?.startDate,
    competition?.endDate,
    competition?.maxParticipants,
    competition?.description,
    competition?.challengeCount,
    competition?.teamCount,
    competition?.status,
  ]);

  useEffect(() => {
    if (!validationTarget?.id) {
      setChecklist(null);
      setLoading(false);
      setCompletedItems({});
      return undefined;
    }

    let disposed = false;
    const timerIds = [];

    const wait = delayMs => new Promise(resolve => {
      const timeoutId = window.setTimeout(resolve, delayMs);
      timerIds.push(timeoutId);
    });

    const validateCompetition = async () => {
      try {
        setLoading(true);
        setChecklist(null);
        setCompletedItems({});
        const nextChecklist = await fetchPreCompetitionValidation(validationTarget);

        if (disposed) {
          return;
        }

        setChecklist(nextChecklist);

        for (const item of nextChecklist.items) {
          await wait(120);

          if (disposed) {
            return;
          }

          setCompletedItems(prev => ({
            ...prev,
            [item.id]: true,
          }));
        }
      } catch (error) {
        console.error("Error validating competition:", error);

        if (!disposed) {
          setChecklist(null);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    void validateCompetition();

    return () => {
      disposed = true;
      timerIds.forEach(timeoutId => window.clearTimeout(timeoutId));
    };
  }, [validationTarget]);

  if (!competition || competition.status === "done") {
    return null;
  }

  const checklistItemMap = Object.fromEntries(
    (checklist?.items || []).map(item => [item.id, item])
  );

  const itemsWithStatus = PRE_COMPETITION_VALIDATION_RULES.map(item => ({
    ...item,
    isValidating: loading && completedItems[item.id] === undefined,
    isCompleted: completedItems[item.id] === true,
    passed: checklistItemMap[item.id]?.passed ?? false,
  }));

  if (loading) {
    return (
      <div className="pre-competition-checklist validation-loading">
        <div className="loading-content">
          <div className="validation-table">
            <div className="table-header">
              <div className="col-check">Status</div>
              <div className="col-label">Requirement</div>
              <div className="col-category">Category</div>
              <div className="col-level">Type</div>
            </div>

            {itemsWithStatus.map(item => (
              <div
                key={item.id}
                className={`table-row ${
                  item.isValidating
                    ? "validating"
                    : item.isCompleted && item.passed
                      ? "passed"
                      : item.isCompleted
                        ? "failed"
                        : "pending"
                }`}
              >
                <div className="col-check">
                  <span
                    className={`status-icon ${
                      item.isCompleted ? (item.passed ? "success" : "error") : ""
                    }`}
                  >
                    {item.isValidating ? (
                      <span className="spinner-mini"></span>
                    ) : item.isCompleted && item.passed ? (
                      <FiCheckCircle />
                    ) : item.isCompleted ? (
                      <FiXCircle />
                    ) : (
                      <span className="status-dot"></span>
                    )}
                  </span>
                </div>
                <div className="col-label">{item.label}</div>
                <div className="col-category">
                  <span className="category-badge">{item.category}</span>
                </div>
                <div className="col-level">
                  <span className={`level-badge ${item.level}`}>{item.level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!checklist) {
    return null;
  }

  return (
    <div className={`pre-competition-checklist ${checklist.competitionReady ? "ready" : "not-ready"}`}>
      <div className="checklist-header">
        <div className="header-copy">
          <div className="header-title">
            <FiClipboard className="header-icon" />
            <h4>Pre-Competition Validation</h4>
          </div>
          <p className="checklist-caption">
            Every checklist item must pass before the competition can be started.
          </p>
        </div>
        <div className={`status-badge ${checklist.startReady ? "ready-badge" : "not-ready-badge"}`}>
          {checklist.startReady ? (
            <>
              <FiCheckCircle /> Ready to Start
            </>
          ) : (
            <>
              <FiXCircle /> Start Blocked
            </>
          )}
        </div>
      </div>

      <div className="checklist-summary">
        <span>{checklist.passedCount}/{checklist.totalCount} total checks passed</span>
        <span>{checklist.requiredPassedCount}/{checklist.requiredCount} core checks passed</span>
        <span>{checklist.recommendedPassedCount}/{checklist.recommendedCount} readiness checks passed</span>
      </div>

      <div className="validation-table">
        <div className="table-header">
          <div className="col-check">Status</div>
          <div className="col-label">Requirement</div>
          <div className="col-category">Category</div>
          <div className="col-level">Type</div>
        </div>

        {checklist.items.map(item => (
          <div key={item.id} className={`table-row ${item.passed ? "passed" : "failed"}`}>
            <div className="col-check">
              <span className={`status-icon ${item.passed ? "success" : "error"}`}>
                {item.passed ? <FiCheckCircle /> : <FiXCircle />}
              </span>
            </div>
            <div className="col-label">{item.label}</div>
            <div className="col-category">
              <span className="category-badge">{item.category}</span>
            </div>
            <div className="col-level">
              <span className={`level-badge ${item.level}`}>{item.level}</span>
            </div>
          </div>
        ))}
      </div>

      {!checklist.startReady && (
        <div className="warning-banner">
          <span className="warning-text">
            <FiInfo />
            Complete every pre-competition validation item before starting the competition.
          </span>
        </div>
      )}
    </div>
  );
};

export default PreCompetitionChecklist;
