import React, { useState } from 'react';

export const useChallengeForm = (initialData = {}) => {
  const defaultForm = {
    title: '',
    category_id: '',
    difficulty: '',
    points: '',
    description: '',
    flag: '',
    hints: [],
    hintCount: 1,
    resources: [],
    status: 'active',
    ...initialData,
  };

  const [formData, setFormData] = useState(defaultForm);
  const [fieldErrors, setFieldErrors] = useState({});

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const resetForm = () => {
    setFormData(defaultForm);
    setFieldErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = true;
    if (!formData.category_id) errors.category_id = true;
    if (!formData.difficulty) errors.difficulty = true;
    
    // Validate points: must be a positive number
    const pointsValue = parseInt(formData.points, 10);
    if (!formData.points || formData.points === '' || isNaN(pointsValue) || pointsValue < 1) {
      errors.points = true;
    }
    
    if (!formData.flag.trim()) errors.flag = true;
    if (!formData.description.trim()) errors.description = true;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  return {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    updateField,
    resetForm,
    validateForm,
  };
};

export default useChallengeForm;
