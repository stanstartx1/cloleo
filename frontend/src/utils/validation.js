/**
 * Form validation utilities
 * Provides common validation functions for forms
 */

import { useState, useCallback } from 'react';

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates phone number (Cameroon format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^(\+237|00237)?[67]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with score and feedback
 */
export const validatePassword = (password) => {
  let score = 0;
  const feedback = [];

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Au moins 8 caractères');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Une lettre minuscule');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Une lettre majuscule');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Un chiffre');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Un caractère spécial');
  }

  return {
    score,
    maxScore: 5,
    isValid: score >= 4,
    feedback: score >= 4 ? [] : feedback
  };
};

/**
 * Validates required field
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid
 */
export const isRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !isNaN(value);
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Validates minimum length
 * @param {string} value - Value to validate
 * @param {number} min - Minimum length
 * @returns {boolean} True if valid
 */
export const minLength = (value, min) => {
  return value && value.length >= min;
};

/**
 * Validates maximum length
 * @param {string} value - Value to validate
 * @param {number} max - Maximum length
 * @returns {boolean} True if valid
 */
export const maxLength = (value, max) => {
  return !value || value.length <= max;
};

/**
 * Validates numeric value
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid
 */
export const isNumeric = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * Validates minimum value
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @returns {boolean} True if valid
 */
export const minValue = (value, min) => {
  return isNumeric(value) && parseFloat(value) >= min;
};

/**
 * Validates maximum value
 * @param {number} value - Value to validate
 * @param {number} max - Maximum value
 * @returns {boolean} True if valid
 */
export const maxValue = (value, max) => {
  return isNumeric(value) && parseFloat(value) <= max;
};

/**
 * Validates that value matches pattern
 * @param {string} value - Value to validate
 * @param {RegExp} pattern - Pattern to match
 * @returns {boolean} True if valid
 */
export const matchesPattern = (value, pattern) => {
  return pattern.test(value);
};

/**
 * Form validation schema
 * Creates a validation schema for forms
 */
export const createValidationSchema = (schema) => {
  return (data) => {
    const errors = {};
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors = [];

      for (const rule of rules) {
        const result = rule(value, data);
        if (result !== true) {
          fieldErrors.push(result);
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
};

/**
 * Common validation rules
 */
export const validationRules = {
  required: (value) => isRequired(value) ? true : 'Ce champ est requis',
  email: (value) => !value || isValidEmail(value) ? true : 'Email invalide',
  phone: (value) => !value || isValidPhone(value) ? true : 'Numéro de téléphone invalide',
  url: (value) => !value || isValidUrl(value) ? true : 'URL invalide',
  minLength: (min) => (value) => minLength(value, min) ? true : `Minimum ${min} caractères`,
  maxLength: (max) => (value) => maxLength(value, max) ? true : `Maximum ${max} caractères`,
  minValue: (min) => (value) => minValue(value, min) ? true : `Minimum ${min}`,
  maxValue: (max) => (value) => maxValue(value, max) ? true : `Maximum ${max}`,
  numeric: (value) => !value || isNumeric(value) ? true : 'Doit être un nombre',
  password: (value) => {
    const result = validatePassword(value);
    return result.isValid ? true : result.feedback.join(', ');
  }
};

/**
 * Real-time form validation hook
 * @param {Object} schema - Validation schema
 * @param {Object} initialData - Initial form data
 * @returns {Object} Validation state and methods
 */
export const useFormValidation = (schema, initialData = {}) => {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback(() => {
    const result = createValidationSchema(schema)(data);
    setErrors(result.errors);
    return result.isValid;
  }, [data, schema]);

  const handleChange = useCallback((field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const handleBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  return {
    data,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
    isValid: Object.keys(errors).length === 0
  };
};
