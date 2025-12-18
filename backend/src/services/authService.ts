import { db } from '../db';
import { users } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateTokenPair, verifyRefreshToken, JWTPayload } from '../utils/jwt';
import { generateAvatarSeed } from '../utils/random';
import { isValidEmail, isValidUsername, normalizeUsername } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';

class AuthService {
  /**
   * Register a new user
   */
  async register(
    email: string,
    username: string,
    password: string,
    agreedToTerms: boolean
  ): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    // Validate inputs
    if (!email || !username || !password) {
      throw new AppError(400, 'Email, username, and password are required');
    }

    if (!agreedToTerms) {
      throw new AppError(400, 'You must agree to the Terms of Service');
    }

    if (!isValidEmail(email)) {
      throw new AppError(400, 'Invalid email format');
    }

    // Normalize username to lowercase slug format
    const normalizedUsername = normalizeUsername(username);

    if (!isValidUsername(normalizedUsername)) {
      throw new AppError(
        400,
        'Username must be 3-20 characters, lowercase alphanumeric and underscores only'
      );
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new AppError(400, passwordValidation.errors.join(', '));
    }

    // Check if user already exists (case-insensitive check for username)
    const existingUser = await db.query.users.findFirst({
      where: or(
        eq(users.email, email),
        eq(users.username, normalizedUsername)
      ),
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new AppError(409, 'Email already registered');
      }
      if (existingUser.username === normalizedUsername) {
        throw new AppError(409, 'Username already taken');
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const [createdUser] = await db.insert(users).values({
      email,
      username: normalizedUsername,
      passwordHash,
      avatarStyle: 'bottts',
      avatarSeed: generateAvatarSeed(),
      agreedToTermsAt: new Date(),
    }).returning();

    // Select only needed fields
    const user = {
      id: createdUser.id,
      email: createdUser.email,
      username: createdUser.username,
      displayName: createdUser.displayName,
      bio: createdUser.bio,
      website: createdUser.website,
      avatarStyle: createdUser.avatarStyle,
      avatarSeed: createdUser.avatarSeed,
      isSuperuser: createdUser.isSuperuser,
      postCred: createdUser.postCred,
      commentCred: createdUser.commentCred,
      emailVerified: createdUser.emailVerified,
      createdAt: createdUser.createdAt,
    };

    // Generate tokens
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      isSuperuser: user.isSuperuser,
    };

    const { accessToken, refreshToken } = generateTokenPair(payload);

    return { user, accessToken, refreshToken };
  }

  /**
   * Login a user
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    // Validate inputs
    if (!email || !password) {
      throw new AppError(400, 'Email and password are required');
    }

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Generate tokens
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      isSuperuser: user.isSuperuser,
    };

    const { accessToken, refreshToken } = generateTokenPair(payload);

    // Return user data (without password hash)
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    if (!refreshToken) {
      throw new AppError(400, 'Refresh token is required');
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    // Verify user still exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      throw new AppError(401, 'User not found');
    }

    // Generate new tokens
    const newPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      isSuperuser: user.isSuperuser,
    };

    return generateTokenPair(newPayload);
  }

  /**
   * Get current user from token
   */
  async getCurrentUser(userId: string): Promise<any> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        website: true,
        avatarStyle: true,
        avatarSeed: true,
        isSuperuser: true,
        postCred: true,
        commentCred: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }
}

export default new AuthService();
