import { users, topics, posts, comments } from '../db/schema';

// Infer types from Drizzle schema
type User = typeof users.$inferSelect;
type Topic = typeof topics.$inferSelect;
type Post = typeof posts.$inferSelect;
type Comment = typeof comments.$inferSelect;

/**
 * Common pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Pagination result
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Sort options for posts
 */
export type PostSortOption = 'hot' | 'top' | 'new' | 'rising' | 'controversial';

/**
 * Sort options for comments
 */
export type CommentSortOption = 'best' | 'top' | 'new' | 'old' | 'controversial';

/**
 * Post with vote count and user vote status
 */
export interface PostWithVotes extends Post {
  voteCount: number;
  userVote?: number; // -1, 0, or 1
  commentCount: number;
  author: Pick<User, 'id' | 'username' | 'avatarStyle' | 'avatarSeed'>;
}

/**
 * Comment with vote count and user vote status
 */
export interface CommentWithVotes extends Comment {
  voteCount: number;
  userVote?: number;
  author: Pick<User, 'id' | 'username' | 'avatarStyle' | 'avatarSeed'>;
  replies?: CommentWithVotes[];
}

/**
 * User profile data (public)
 */
export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  website?: string;
  avatarStyle: string;
  avatarSeed: string;
  postCred: number;
  commentCred: number;
  createdAt: Date;
}

/**
 * Topic with member count
 */
export interface TopicWithStats extends Topic {
  memberCount: number;
  postCount: number;
  isMember?: boolean;
}

/**
 * Service response
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * File upload result
 */
export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}
