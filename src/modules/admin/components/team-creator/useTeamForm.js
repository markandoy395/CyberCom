/**
 * Team Creator Hook - Manages team and member form state
 */
import { useState } from 'react';

const AUTO_ROLE_SEQUENCE = ['captain', 'co-captain', 'member', 'member'];
const DEFAULT_MEMBER = {
  username: '',
  name: '',
  email: '',
  password: '',
  role: 'member',
  roleMode: 'auto',
};
const AUTO_EMAIL_DOMAIN = 'cybercom.local';
const MEMBER_INPUT_FIELDS = ['username', 'name', 'email', 'password'];
const createDefaultMembers = () => Array.from({ length: 4 }, () => ({ ...DEFAULT_MEMBER }));
const toTitleCase = value => value
  .split(/\s+/)
  .filter(Boolean)
  .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
  .join(' ');
const hasMemberInput = member => MEMBER_INPUT_FIELDS
  .some(field => String(member?.[field] ?? '').trim());
const normalizeIdentityValue = value => String(value || '').trim().toLowerCase();
const getParticipantNameSegment = username => {
  const trimmedUsername = String(username || '').trim();

  if (!trimmedUsername) {
    return '';
  }

  const usernameParts = trimmedUsername.split('_').filter(Boolean);

  return usernameParts.length > 1
    ? usernameParts.slice(1).join('_')
    : trimmedUsername;
};
const buildAutoNameFromUsername = username => {
  const suffix = getParticipantNameSegment(username);

  if (!suffix) {
    return '';
  }

  if (/^\d+$/.test(suffix)) {
    return `Participant ${suffix}`;
  }

  return toTitleCase(suffix.replace(/[-.]+/g, ' '));
};
const buildAutoEmailFromUsername = username => {
  const trimmedUsername = String(username || '').trim().toLowerCase();

  return trimmedUsername
    ? `${trimmedUsername}@${AUTO_EMAIL_DOMAIN}`
    : '';
};
const buildAutoMemberFields = username => ({
  name: buildAutoNameFromUsername(username),
  email: buildAutoEmailFromUsername(username),
});
const shouldReplaceAutoValue = (currentValue, previousAutoValue) => {
  const trimmedCurrentValue = String(currentValue || '').trim();
  const trimmedPreviousAutoValue = String(previousAutoValue || '').trim();

  return !trimmedCurrentValue || trimmedCurrentValue === trimmedPreviousAutoValue;
};
const hasMemberInput = member => [
  member.username,
  member.name,
  member.email,
  member.password,
].some(value => String(value || '').trim());
const getAutoRoleForPosition = position => (
  AUTO_ROLE_SEQUENCE[position] || 'member'
);
const applyAutoRoles = members => {
  let activeMemberIndex = 0;

  return members.map(member => {
    if (!hasMemberInput(member)) {
      if (member.roleMode === 'manual') {
        return member;
      }

      return {
        ...member,
        role: 'member',
        roleMode: 'auto',
      };
    }

    const rolePosition = activeMemberIndex;
    activeMemberIndex += 1;

    if (member.roleMode === 'manual') {
      return member;
    }

    return {
      ...member,
      role: getAutoRoleForPosition(rolePosition),
      roleMode: 'auto',
    };
  });
};

export const useTeamForm = () => {
  const [formData, setFormData] = useState({
    teamName: '',
    members: createDefaultMembers(),
  });
  const [showPassword, setShowPassword] = useState({});

  const updateTeamName = (name) => {
    setFormData(prev => ({ 
      ...prev, 
      teamName: name,
    }));
  };

  const updateMember = (index, field, value) => {
    setFormData(prev => {
      const newMembers = [...prev.members];
      const currentMember = newMembers[index];
      const nextMember = { ...currentMember, [field]: value };

      if (field === 'username') {
        const previousAutoFields = buildAutoMemberFields(currentMember.username);
        const nextAutoFields = buildAutoMemberFields(value);

        if (shouldReplaceAutoValue(currentMember.name, previousAutoFields.name)) {
          nextMember.name = nextAutoFields.name;
        }

        if (shouldReplaceAutoValue(currentMember.email, previousAutoFields.email)) {
          nextMember.email = nextAutoFields.email;
        }
      }

      if (field === 'role') {
        nextMember.roleMode = 'manual';
      }

      newMembers[index] = nextMember;

      return {
        ...prev,
        members: applyAutoRoles(newMembers),
      };
    });
  };

  const togglePasswordVisibility = (index) => {
    setShowPassword(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const resetForm = () => {
    setFormData({
      teamName: '',
      members: createDefaultMembers(),
    });
    setShowPassword({});
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.teamName.trim()) {
      errors.push('Team name is required');
    }

    const populatedMembers = formData.members
      .map((member, index) => ({ member, index }))
      .filter(({ member }) => hasMemberInput(member));

    if (populatedMembers.length === 0) {
      errors.push('At least one team member is required');
    }

    const seenUsernames = new Map();
    const seenEmails = new Map();

    populatedMembers.forEach(({ member, index }) => {
      const rowNumber = index + 1;
      const trimmedUsername = String(member.username || '').trim();
      const trimmedName = String(member.name || '').trim();
      const trimmedEmail = String(member.email || '').trim();

      if (!trimmedUsername) errors.push(`Member ${rowNumber}: Username is required`);
      if (!trimmedName) errors.push(`Member ${rowNumber}: Full name is required`);
      if (!trimmedEmail) errors.push(`Member ${rowNumber}: Email is required`);
      if (!member.password) errors.push(`Member ${rowNumber}: Password is required`);

      const normalizedUsername = normalizeIdentityValue(trimmedUsername);
      if (normalizedUsername) {
        if (seenUsernames.has(normalizedUsername)) {
          errors.push(`Member ${rowNumber}: Username "${trimmedUsername}" is duplicated`);
        } else {
          seenUsernames.set(normalizedUsername, rowNumber);
        }
      }

      const normalizedEmail = normalizeIdentityValue(trimmedEmail);
      if (normalizedEmail) {
        if (seenEmails.has(normalizedEmail)) {
          errors.push(`Member ${rowNumber}: Email "${trimmedEmail}" is duplicated`);
        } else {
          seenEmails.set(normalizedEmail, rowNumber);
        }
      }
    });

    return errors;
  };

  return {
    formData,
    showPassword,
    updateTeamName,
    updateMember,
    togglePasswordVisibility,
    resetForm,
    validateForm,
  };
};
