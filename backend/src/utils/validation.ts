/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username format
 * Requirements:
 * - 3-20 characters
 * - Lowercase alphanumeric and underscores only
 * - Cannot start or end with underscore
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-z0-9]([a-z0-9_]{1,18}[a-z0-9])?$/;
  return usernameRegex.test(username);
}

/**
 * Normalize username to slug format
 * - Converts to lowercase
 * - Removes invalid characters
 * - Ensures proper format
 */
export function normalizeUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    throw new Error('Username is required');
  }

  return username
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 20);
}

/**
 * Validate topic name format
 * Requirements:
 * - 3-30 characters
 * - Alphanumeric only (lowercase)
 * - No spaces or special characters
 */
export function isValidTopicName(name: string): boolean {
  const topicNameRegex = /^[a-z0-9]{3,30}$/;
  return topicNameRegex.test(name);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate hex color code
 */
export function isValidHexColor(color: string): boolean {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
}

/**
 * Sanitize and validate integer input
 */
export function sanitizeInteger(
  value: any,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  const num = parseInt(value, 10);
  if (isNaN(num)) return defaultValue;
  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;
  return num;
}

/**
 * Sanitize and validate page number
 */
export function sanitizePageNumber(page: any): number {
  return sanitizeInteger(page, 1, 1);
}

/**
 * Sanitize and validate limit/page size
 */
export function sanitizeLimit(limit: any, defaultLimit: number = 20): number {
  return sanitizeInteger(limit, defaultLimit, 1, 100);
}

/**
 * Check if string contains profanity (basic check)
 * In production, use a comprehensive profanity filter library
 */
export function containsProfanity(text: string): boolean {
  const profanityList = ['spam', 'fuck', 'shit']; // Basic list for demo
  const lowerText = text.toLowerCase();
  return profanityList.some((word) => lowerText.includes(word));
}
