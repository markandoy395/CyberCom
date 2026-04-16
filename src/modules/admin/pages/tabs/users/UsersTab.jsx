import React, { useMemo } from "react";
import { FaTriangleExclamation } from "react-icons/fa6";
import { TeamAccountCreator } from "../../../components";
import "./UsersTab.css";

const UsersTab = ({
  competitions = [],
  selectedCompId = null,
}) => {
  const selectedCompetition = useMemo(
    () => competitions.find(competition => Number(competition.id) === Number(selectedCompId)) || null,
    [competitions, selectedCompId]
  );

  return (
    <>
      <div className="admin-section">
        <div className="section-header">
          <h3>Team Management</h3>
          <p className="section-subtitle">Manage teams and team members</p>
        </div>

        {selectedCompetition ? (
          <div className="active-competition-display">
            <div className="info-label">Selected Competition:</div>
            <div className="competition-name">{selectedCompetition.name}</div>
            <div className="competition-status">
              <span
                className={`status-badge ${
                  selectedCompetition.status === "active" ? "active" : ""
                }`}
              >
                {selectedCompetition.status || "pending"}
              </span>
            </div>
          </div>
        ) : (
          <div className="competition-required-message">
            <div className="message-icon">
              <FaTriangleExclamation />
            </div>
            <h3>No Competition Available</h3>
            <p>Create or reopen a competition to manage team accounts.</p>
          </div>
        )}

        {selectedCompetition ? (
          <TeamAccountCreator competitionId={selectedCompetition.id} />
        ) : null}
      </div>
    </>
  );
};

export default UsersTab;
