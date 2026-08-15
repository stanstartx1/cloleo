/**
 * Test file for validation utilities
 */

import {
  isValidEmail,
  isValidPhone,
  isValidUrl,
  validatePassword,
  isRequired,
  minLength,
  maxLength,
  isNumeric,
  minValue,
  maxValue,
  validationRules,
  createValidationSchema
} from '../../utils/validation';

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('returns true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('returns false for invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('returns true for valid Cameroon phone', () => {
      expect(isValidPhone('+237 612 345 678')).toBe(true);
      expect(isValidPhone('612345678')).toBe(true);
    });

    it('returns false for invalid phone', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('1234567890')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('returns valid score for strong password', () => {
      const result = validatePassword('StrongP@ss123');
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(5);
    });

    it('returns invalid score for weak password', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(4);
    });
  });

  describe('isRequired', () => {
    it('returns true for non-empty values', () => {
      expect(isRequired('test')).toBe(true);
      expect(isRequired(123)).toBe(true);
    });

    it('returns false for empty values', () => {
      expect(isRequired('')).toBe(false);
      expect(isRequired(null)).toBe(false);
      expect(isRequired(undefined)).toBe(false);
    });
  });

  describe('createValidationSchema', () => {
    it('validates data against schema', () => {
      const schema = {
        email: [validationRules.required, validationRules.email],
        password: [validationRules.required, validationRules.minLength(8)]
      };

      const result = createValidationSchema(schema)({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result.isValid).toBe(true);
    });

    it('returns errors for invalid data', () => {
      const schema = {
        email: [validationRules.required, validationRules.email],
        password: [validationRules.required, validationRules.minLength(8)]
      };

      const result = createValidationSchema(schema)({
        email: 'invalid',
        password: 'short'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
    });
  });
});
