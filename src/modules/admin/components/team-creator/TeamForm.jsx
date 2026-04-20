/**
 * Team Form Component
 */
import React from 'react';
import { FaEye, FaEyeSlash } from '../../../../utils/icons';
import ActionButton from '../../../../common/ActionButton';

const TeamForm = ({
  formData,
  onTeamNameChange,
  members,
  onMemberChange,
  onTogglePassword,
  showPassword,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  return (
    <div className="team-form">
      <div className="form-group">
        <label>Team Name *</label>
        <input
          type="text"
          placeholder="Enter team name"
          value={formData.teamName}
          onChange={(e) => onTeamNameChange(e.target.value)}
          className="form-input"
        />
      </div>

      <div className="members-section">
        <h3>Team Members (up to 4)</h3>
        <p className="members-help-text">
          Roles auto-fill as Captain, Co-Captain, then Member. You can still change any role manually.
        </p>
        {members.map((member, index) => (
          <div key={index} className="member-row">
            <input
              type="text"
              placeholder="Username"
              value={member.username}
              onChange={(e) => onMemberChange(index, 'username', e.target.value)}
              className="form-input"
            />
            <input
              type="text"
              placeholder="Full name"
              value={member.name}
              onChange={(e) => onMemberChange(index, 'name', e.target.value)}
              className="form-input"
            />
            <input
              type="email"
              placeholder="Email"
              value={member.email}
              onChange={(e) => onMemberChange(index, 'email', e.target.value)}
              className="form-input"
            />
            <select
              value={member.role || 'member'}
              onChange={(e) => onMemberChange(index, 'role', e.target.value)}
              className="form-input"
            >
              <option value="captain">Captain</option>
              <option value="co-captain">Co-Captain</option>
              <option value="member">Member</option>
            </select>
            <div className="password-input-group">
              <input
                type={showPassword[index] ? 'text' : 'password'}
                placeholder="Password"
                value={member.password}
                onChange={(e) => onMemberChange(index, 'password', e.target.value)}
                className="form-input"
              />
              <button
                type="button"
                onClick={() => onTogglePassword(index)}
                className="toggle-password-btn"
              >
                {showPassword[index] ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <ActionButton
          type="button"
          onClick={onSubmit}
          className="btn btn-primary"
          variant="custom"
          size="custom"
          isLoading={isSubmitting}
          loadingText="Creating Team..."
        >
          Create Team
        </ActionButton>
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default TeamForm;
