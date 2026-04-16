/**
 * Team Creator Hook - Manages team and member form state
 */
import { useState } from 'react';

const DEFAULT_MEMBER = {
  username: '',
  name: '',
  email: '',
  password: '',
  role: 'member',
};
const AUTO_EMAIL_DOMAIN = 'cybercom.local';
const createDefaultMembers = () => Array.from({ length: 4 }, () => ({ ...DEFAULT_MEMBER }));
const toTitleCase = value => value
  .split(/\s+/)
  .filter(Boolean)
  .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
  .join(' ');
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

      newMembers[index] = nextMember;
      return { ...prev, members: newMembers };
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

    const validMembers = formData.members.filter(m => m.name || m.email || m.password);
    if (validMembers.length === 0) {
      errors.push('At least one team member is required');
    }

    validMembers.forEach((member, index) => {
      if (!member.username) errors.push(`Member ${index + 1}: Username is required`);
      if (!member.name) errors.push(`Member ${index + 1}: Full name is required`);
      if (!member.email) errors.push(`Member ${index + 1}: Email is required`);
      if (!member.password) errors.push(`Member ${index + 1}: Password is required`);
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
