import React, { useCallback, useEffect, useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { FaPlus } from "../../../../utils/icons";
import { apiDelete, apiGet, apiPost, API_ENDPOINTS } from "../../../../utils/api";
import NotificationModal from "../../../../common/NotificationModal";
import { TeamForm, TeamList, useTeamForm } from "../team-creator";
import "./TeamAccountCreator.css";

const TeamAccountCreator = ({ competitionId }) => {
  const [teams, setTeams] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    formData,
    showPassword,
    updateMember,
    updateTeamName,
    togglePasswordVisibility,
    resetForm,
    validateForm,
  } = useTeamForm();
  const [notification, setNotification] = useState(null);
  const showResult = useCallback((message, isSuccess) => {
    setNotification({
      type: isSuccess ? 'success' : 'error',
      title: isSuccess ? 'Success' : 'Error',
      message,
    });
  }, []);

  const fetchTeams = useCallback(async () => {
    if (!competitionId) {
      setTeams([]);
      return;
    }

    try {
      const result = await apiGet(API_ENDPOINTS.COMPETITIONS_TEAMS(competitionId));

      if (result.success) {
        const teamsData = result.data || [];
        const formattedTeams = Array.isArray(teamsData)
          ? teamsData.map(team => ({
              id: team.id,
              teamName: team.name,
              members: team.members || [],
              memberCount: team.memberCount || 0,
              createdAt: team.created_at ? new Date(team.created_at).toLocaleDateString() : "",
              status: "active",
              competition_id: team.competition_id,
            }))
          : [];

        setTeams(formattedTeams);
      }
    } catch {
      showResult("Failed to fetch teams", false);
    }
  }, [competitionId, showResult]);

  useEffect(() => {
    void fetchTeams();

    const interval = setInterval(() => {
      void fetchTeams();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchTeams]);

  const portalElement = useMemo(() => {
    if (typeof document === 'undefined') return null;
    let element = document.getElementById("modal-portal");
    if (!element) {
      element = document.createElement("div");
      element.id = "modal-portal";
      document.body.appendChild(element);
    }
    return element;
  }, []);

  useEffect(() => {
    if (!showForm) return;

    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setShowForm(false);
        resetForm();
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
  }, [showForm, resetForm]);

  const handleCreateTeam = async () => {
    const errors = validateForm();

    if (errors.length > 0) {
      showResult(errors[0], false);
      return;
    }

    if (teams.length >= 2) {
      showResult("Maximum 2 teams per competition", false);
      return;
    }

    setLoading(true);

    try {
      const response = await apiPost(API_ENDPOINTS.TEAMS_CREATE, {
        competition_id: competitionId,
        teamName: formData.teamName,
        members: formData.members,
      });

      if (response.success) {
        showResult("Team created successfully", true);
        await fetchTeams();
        resetForm();
        setShowForm(false);
      } else {
        showResult(response.message || "Failed to create team", false);
      }
    } catch (error) {
      console.error("Team creation error:", error);
      showResult("Error creating team", false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async teamId => {
    setLoading(true);

    try {
      const response = await apiDelete(API_ENDPOINTS.TEAMS_DELETE(teamId));

      if (response.success) {
        showResult("Team deleted successfully", true);
        await fetchTeams();
      } else {
        showResult("Failed to delete team", false);
      }
    } catch {
      showResult("Error deleting team", false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NotificationModal notification={notification} onDismiss={() => setNotification(null)} duration={3000} />

      <div className="team-creator">
        <div className="creator-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>Team Management</h2>
              <p>Create and manage teams and members</p>
            </div>
            {!showForm && teams.length < 2 && (
              <button className="btn btn-primary" onClick={() => { setShowForm(true); resetForm(); }}>
                <FaPlus /> Create Team
              </button>
            )}
            {!showForm && teams.length >= 2 && (
              <div style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic", fontWeight: 500 }}>
                Maximum 2 teams reached
              </div>
            )}
          </div>
        </div>

        {!showForm && teams.length > 0 && (
          <div className="teams-list-section">
            <TeamList
              teams={teams}
              onDelete={handleDeleteTeam}
              isLoading={loading}
              onMembersUpdated={fetchTeams}
            />
          </div>
        )}

        {!showForm && teams.length === 0 && (
          <div className="empty-state">
            <p>No teams created yet. Click "Create Team" to get started.</p>
          </div>
        )}
      </div>

      {showForm && portalElement && ReactDOM.createPortal(
        <div 
          className="team-form-modal-backdrop" 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              resetForm();
            }
          }}
        >
          <div className="team-form-modal">
            <div className="modal-header">
              <div className="header-left">
                <h3 className="modal-title" style={{ fontSize: "20px", fontWeight: 700, margin: 0, letterSpacing: "-0.2px" }}>Create New Team</h3>
              </div>
              <div className="header-right">
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="modal-body form-wrapper">
              <TeamForm
                formData={formData}
                onTeamNameChange={updateTeamName}
                members={formData.members}
                onMemberChange={updateMember}
                onTogglePassword={togglePasswordVisibility}
                showPassword={showPassword}
                onSubmit={handleCreateTeam}
                onCancel={() => { setShowForm(false); resetForm(); }}
              />
            </div>
          </div>
        </div>,
        portalElement
      )}
    </>
  );
};

export default TeamAccountCreator;
