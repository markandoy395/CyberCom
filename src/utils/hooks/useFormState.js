import { useState } from 'react';

/**
 * Unified hook for managing form state across admin components
 * Replaces useChallengeForm, usePracticeForm, useTeamForm
 * @param {Object} initialData - Initial form data
 * @param {Function} onValidate - Validation function (optional)
 */
const useFormState = (initialData = {}, onValidate = null) => {
  const [formData, setFormData] = useState(initialData);
  const [fieldErrors, setFieldErrors] = useState({});

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user corrects it
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const updateNestedField = (parent, index, field, value) => {
    setFormData(prev => {
      const updated = [...prev[parent]];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [parent]: updated };
    });
  };

  const validateForm = () => {
    if (onValidate) {
      const errors = onValidate(formData);
      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
    }
    return true;
  };

  const resetForm = () => {
    setFormData(initialData);
    setFieldErrors({});
  };

  const getFieldError = (field) => fieldErrors[field] || false;

  const setFormErrors = (errors) => {
    setFieldErrors(errors);
  };

  return {
    formData,
    setFormData,
    updateField,
    updateNestedField,
    fieldErrors,
    setFieldErrors,
    getFieldError,
    setFormErrors,
    validateForm,
    resetForm,
  };
};

export default useFormState;
