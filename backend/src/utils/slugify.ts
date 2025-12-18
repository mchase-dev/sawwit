import * as crypto from 'crypto';

/**
 * Generate a URL-friendly slug from a string
 * @param text - The text to slugify
 * @param maxLength - Maximum length of the slug (default: 50)
 * @returns A URL-friendly slug
 */
export function slugify(text: string, maxLength: number = 50): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, maxLength);
}

/**
 * Generate a unique slug for a post
 * Format: [6 random chars]-[normalized title]
 * @param title - The post title
 * @returns A unique slug
 */
export function generatePostSlug(title: string): string {
  const randomPrefix = crypto.randomBytes(3).toString('hex'); // 6 characters
  const normalizedTitle = slugify(title, 44); // 50 - 6 (prefix) = 44
  return `${randomPrefix}-${normalizedTitle}`;
}

/**
 * Generate a URL-friendly topic name
 * @param name - The topic name
 * @returns A URL-friendly topic name (lowercase, no spaces)
 */
export function generateTopicName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Topic name is required');
  }

  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '')
    .replace(/-+/g, '')
    .substring(0, 30);
}
