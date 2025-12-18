/**
 * Validation utilities for user input
 */

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate username format (lowercase alphanumeric and underscores, 3-20 characters)
 * Cannot start or end with underscore
 */
export const isValidUsername = (username: string): boolean => {
  const usernameRegex = /^[a-z0-9]([a-z0-9_]{1,18}[a-z0-9])?$/;
  return usernameRegex.test(username);
};

/**
 * Normalize username to lowercase slug format
 */
export const normalizeUsername = (username: string): string => {
  return username
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 20);
};

/**
 * Validate password strength
 * Requirements: at least 8 characters, contains uppercase, lowercase, and number
 */
export const isValidPassword = (password: string): boolean => {
  if (password.length < 8) {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  return hasUppercase && hasLowercase && hasNumber;
};

/**
 * Get password strength feedback
 */
export const getPasswordStrength = (password: string): {
  strength: 'weak' | 'medium' | 'strong';
  feedback: string[];
} => {
  const feedback: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('Include at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('Include at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    feedback.push('Include at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push('Consider adding special characters for extra security');
  }

  if (feedback.length === 0) {
    strength = 'strong';
  } else if (feedback.length <= 2) {
    strength = 'medium';
  }

  return { strength, feedback };
};

/**
 * Validate topic name format (alphanumeric and underscores, 3-21 characters)
 */
export const isValidTopicName = (name: string): boolean => {
  const topicNameRegex = /^[a-zA-Z0-9_]{3,21}$/;
  return topicNameRegex.test(name);
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate that a string is not empty or just whitespace
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validate that a string is within a length range
 */
export const isWithinLength = (value: string, min: number, max: number): boolean => {
  const length = value.trim().length;
  return length >= min && length <= max;
};

/**
 * Sanitize input by removing leading/trailing whitespace and limiting length
 */
export const sanitizeInput = (value: string, maxLength?: number): string => {
  let sanitized = value.trim();
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
};
