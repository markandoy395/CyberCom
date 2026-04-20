import React, { useCallback, useRef, useState } from 'react';

const toSafeString = value => (value == null ? '' : String(value));

const normalizeHints = hints => (
  Array.isArray(hints)
    ? hints.map(hint => toSafeString(hint))
    : []
);

export const normalizeChallengeFormData = (rawData = {}) => {
  const normalizedHints = normalizeHints(rawData.hints);
  const parsedHintCount = Number.parseInt(rawData.hintCount, 10);
  const hintCount = Number.isFinite(parsedHintCount) && parsedHintCount > 0
    ? parsedHintCount
    : Math.max(normalizedHints.length, 1);

  return {
    ...rawData,
    title: toSafeString(rawData.title),
    category_id: rawData.category_id == null ? '' : String(rawData.category_id),
    difficulty: toSafeString(rawData.difficulty),
    points: rawData.points == null ? '' : String(rawData.points),
    description: toSafeString(rawData.description),
    flag: toSafeString(rawData.flag),
    hints: normalizedHints,
    hintCount,
    resources: Array.isArray(rawData.resources) ? rawData.resources : [],
    status: rawData.status ? String(rawData.status) : 'active',
  };
};

export const getChallengeFormValidationErrors = (formData = {}) => {
  const errors = {};
  const title = toSafeString(formData.title).trim();
  const categoryId = toSafeString(formData.category_id).trim();
  const difficulty = toSafeString(formData.difficulty).trim();
  const points = toSafeString(formData.points).trim();
  const description = toSafeString(formData.description).trim();
  const flag = toSafeString(formData.flag).trim();
  const pointsValue = Number.parseInt(points, 10);

  if (!title) errors.title = true;
  if (!categoryId) errors.category_id = true;
  if (!difficulty) errors.difficulty = true;
  if (!points || Number.isNaN(pointsValue) || pointsValue < 1) errors.points = true;
  if (!flag) errors.flag = true;
  if (!description) errors.description = true;

  return errors;
};

export const useChallengeForm = (initialData = {}) => {
  const initialFormRef = useRef(normalizeChallengeFormData({
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
  }));

  const [formData, setFormDataState] = useState(initialFormRef.current);
  const [fieldErrors, setFieldErrors] = useState({});

  const setFormData = useCallback((nextValue) => {
    setFormDataState(prevFormData => normalizeChallengeFormData(
      typeof nextValue === 'function' ? nextValue(prevFormData) : nextValue
    ));
  }, []);

  const updateField = (field, value) => {
    setFormDataState(prev => normalizeChallengeFormData({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const resetForm = useCallback(() => {
    setFormDataState(initialFormRef.current);
    setFieldErrors({});
  }, []);

  const validateForm = useCallback(() => {
    const errors = getChallengeFormValidationErrors(formData);
    setFieldErrors(errors);
    return errors;
  }, [formData]);

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
