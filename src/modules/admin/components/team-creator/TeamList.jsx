/**
 * Team List Component
 */
import React, { useState } from 'react';
import { FaTrash, BiUser, BiChevronDown, BiChevronUp, FaPenToSquare } from '../../../../utils/icons';
import { apiDelete, API_ENDPOINTS } from '../../../../utils/api';
import './TeamList.css';

const TeamList = ({ teams, onDelete, isLoading, onMembersUpdated }) => {
  const [expandedTeams, setExpandedTeams] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  const toggleExpand = (teamId) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  const handleDeleteMember = async (teamId, memberId, memberName) => {
    if (window.confirm(`Delete member "${memberName}" from this team?`)) {
      setActionLoading(memberId);
      try {
        const response = await apiDelete(API_ENDPOINTS.TEAMS_MEMBER_DELETE(teamId, memberId));
        if (response.success) {
          // Notify parent to refresh the team data
          if (onMembersUpdated) {
            onMembersUpdated();
          }
        } else {
          alert(response.message || 'Failed to delete member');
        }
      } catch (error) {
        console.error('Error deleting member:', error);
        alert('Error deleting member');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleEditMember = (member) => {
    // TODO: Open modal to edit member details (name, email, role, password)
    alert(`Edit functionality coming soon for ${member.username}`);
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'active':
        return 'badge-success';
      case 'inactive':
        return 'badge-inactive';
      default:
        return 'badge-default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="team-list-container">
      {teams.length === 0 ? (
        <div className="empty-state-list">
          <p>No teams created yet</p>
        </div>
      ) : (
        <div className="team-list-table">
          <div className="table-header">
            <div className="col-name">Team Name</div>
            <div className="col-members">Members</div>
            <div className="col-status">Status</div>
            <div className="col-date">Created</div>
            <div className="col-actions">Actions</div>
          </div>

          {teams.map((team) => (
            <div key={team.id} className="team-row">
              <div 
                className="team-row-header"
                onClick={() => toggleExpand(team.id)}
              >
                <div className="col-name">
                  <span className="expand-toggle">
                    {expandedTeams[team.id] ? <BiChevronUp /> : <BiChevronDown />}
                  </span>
                  <div className="team-name-section">
                    <h3 className="team-name">{team.teamName}</h3>
                    <span className="member-count">
                      <BiUser /> {team.memberCount || 0} member{team.memberCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="col-members">{team.memberCount || 0}</div>
                <div className="col-status">
                  <span className={`status-badge ${getStatusBadgeClass(team.status || 'active')}`}>
                    {team.status || 'active'}
                  </span>
                </div>
                <div className="col-date">{formatDate(team.createdAt)}</div>
                <div className="col-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete team "${team.teamName}"?`)) {
                        onDelete(team.id);
                      }
                    }}
                    disabled={isLoading}
                    className="btn btn-danger btn-sm"
                    title="Delete team"
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>

              {expandedTeams[team.id] && (
                <div className="team-details">
                  <div className="members-section">
                    <h4>Team Members</h4>
                    {team.members && team.members.length > 0 ? (
                      <div className="members-list">
                        <div className="members-header">
                          <span className="col-member-username">Username</span>
                          <span className="col-member-email">Email</span>
                          <span className="col-member-role">Role</span>
                          <span className="col-member-status">Status</span>
                          <span className="col-member-actions">Actions</span>
                        </div>
                        {team.members.map((member, idx) => (
                          <div key={member.id || `${team.id}-${idx}`} className="member-item">
                            <span className="col-member-username">{member.username || member.name || 'N/A'}</span>
                            <span className="col-member-email">{member.email}</span>
                            <span className="col-member-role">{member.role || 'member'}</span>
                            <span className="col-member-status">
                              <span className={`status-indicator ${(member.status || 'offline').toLowerCase()}`}>
                                <span className="status-dot"></span>
                                {(member.status || 'offline').charAt(0).toUpperCase() + (member.status || 'offline').slice(1)}
                              </span>
                            </span>
                            <span className="col-member-actions">
                              <button
                                className="btn-member-action btn-edit"
                                onClick={() => handleEditMember(member)}
                                title="Edit member"
                                disabled={actionLoading === member.id}
                              >
                                <FaPenToSquare />
                              </button>
                              <button
                                className="btn-member-action btn-delete"
                                onClick={() => handleDeleteMember(team.id, member.id, member.username)}
                                title="Delete member"
                                disabled={actionLoading === member.id}
                              >
                                <FaTrash />
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-members">No members in this team</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamList;
