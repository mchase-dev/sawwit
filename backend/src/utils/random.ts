import * as crypto from 'crypto';

/**
 * Generate a random hex string
 */
export function generateRandomHex(bytes: number = 20): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a random UUID
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a random avatar seed (40 characters)
 */
export function generateAvatarSeed(): string {
  return generateRandomHex(20); // 20 bytes = 40 hex characters
}

/**
 * Generate a random verification token
 */
export function generateVerificationToken(): string {
  return generateRandomHex(32); // 64 characters
}

/**
 * Generate a random string of specified length
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }

  return result;
}

/**
 * Generate a random alphanumeric code
 */
export function generateCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }

  return result;
}
