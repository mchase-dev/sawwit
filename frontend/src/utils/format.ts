/**
 * Format utilities for dates, numbers, and text
 */

/**
 * Parse a date string, treating timezone-less strings as UTC
 */
const parseDate = (date: string | Date): Date => {
  if (typeof date === 'string') {
    if (!date.endsWith('Z') && !date.match(/[+-]\d{2}:\d{2}$/)) {
      return new Date(date + 'Z');
    }
    return new Date(date);
  }
  return date;
};

/**
 * Format a date into a relative time string (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const past = parseDate(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
};

/**
 * Format a date into a human-readable string
 */
export const formatDate = (date: string | Date): string => {
  return parseDate(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format a date and time into a human-readable string
 */
export const formatDateTime = (date: string | Date): string => {
  return parseDate(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a number with commas (e.g., 1000 -> "1,000")
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};

/**
 * Format a number into a compact string (e.g., 1000 -> "1k")
 */
export const formatCompactNumber = (num: number): string => {
  if (num < 1000) {
    return num.toString();
  }

  if (num < 1000000) {
    const k = Math.floor(num / 100) / 10;
    return `${k}k`;
  }

  const m = Math.floor(num / 100000) / 10;
  return `${m}m`;
};

/**
 * Truncate text to a maximum length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Format a vote count with + or - sign
 */
export const formatVoteCount = (count: number): string => {
  if (count > 0) {
    return `+${formatCompactNumber(count)}`;
  }
  if (count < 0) {
    return formatCompactNumber(count);
  }
  return '0';
};

/**
 * Pluralize a word based on count
 */
export const pluralize = (count: number, singular: string, plural?: string): string => {
  if (count === 1) {
    return singular;
  }
  return plural || `${singular}s`;
};
