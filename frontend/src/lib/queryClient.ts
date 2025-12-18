import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Query keys factory for consistent cache key management
export const queryKeys = {
  // Auth
  auth: {
    me: ['auth', 'me'] as const,
  },
  // Users
  users: {
    all: ['users'] as const,
    detail: (username: string) => ['users', username] as const,
    posts: (username: string, page: number) => ['users', username, 'posts', page] as const,
    comments: (username: string, page: number) => ['users', username, 'comments', page] as const,
    saved: (page: number) => ['users', 'me', 'saved', page] as const,
  },
  // Topics
  topics: {
    all: (page: number, sort: string) => ['topics', page, sort] as const,
    detail: (name: string) => ['topics', name] as const,
    posts: (name: string, page: number, sort: string) => ['topics', name, 'posts', page, sort] as const,
    memberships: ['topics', 'memberships'] as const,
    moderated: ['topics', 'moderated'] as const,
  },
  // Posts
  posts: {
    all: ['posts'] as const,
    detail: (id: string) => ['posts', id] as const,
    comments: (id: string, sort: string) => ['posts', id, 'comments', sort] as const,
  },
  // Comments
  comments: {
    all: ['comments'] as const,
    detail: (id: string) => ['comments', id] as const,
  },
  // Notifications
  notifications: {
    all: (page: number, status?: string) => ['notifications', page, status] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
  // Tags
  tags: {
    topic: (topicId: string) => ['tags', 'topic', topicId] as const,
    detail: (id: string) => ['tags', id] as const,
  },
  // Badges
  badges: {
    user: (userId: string) => ['badges', 'user', userId] as const,
    types: ['badges', 'types'] as const,
  },
  // Reports
  reports: {
    queue: (page: number) => ['reports', 'queue', page] as const,
    all: (page: number, status?: string) => ['reports', page, status] as const,
  },
  // Trending
  trending: {
    topics: (limit: number) => ['trending', 'topics', limit] as const,
    posts: (limit: number) => ['trending', 'posts', limit] as const,
    topicPosts: (topicId: string, limit: number) => ['trending', 'posts', 'topic', topicId, limit] as const,
  },
  // Search
  search: {
    global: (query: string, type?: string) => ['search', query, type] as const,
    topic: (topicName: string, query: string) => ['search', 'topic', topicName, query] as const,
  },
  // Feed
  feed: {
    home: (page: number, sort: string) => ['feed', 'home', page, sort] as const,
    all: (page: number, sort: string, nsfw: boolean) => ['feed', 'all', page, sort, nsfw] as const,
  },
  // Messages
  messages: {
    conversations: (page: number) => ['messages', 'conversations', page] as const,
    conversation: (partnerId: string, page: number) => ['messages', 'conversation', partnerId, page] as const,
    unreadCount: ['messages', 'unread-count'] as const,
  },
  // Blocks
  blocks: {
    all: (page: number) => ['blocks', page] as const,
    check: (userId: string) => ['blocks', 'check', userId] as const,
  },
  // Mod Log
  modLog: {
    topic: (topicId: string, page: number, filters?: any) => ['modlog', 'topic', topicId, page, filters] as const,
    moderator: (moderatorId: string, page: number) => ['modlog', 'moderator', moderatorId, page] as const,
    stats: (topicId: string) => ['modlog', 'stats', topicId] as const,
  },
  // Automod
  automod: {
    topic: (topicId: string) => ['automod', 'topic', topicId] as const,
    detail: (id: string) => ['automod', id] as const,
    stats: (id: string) => ['automod', 'stats', id] as const,
  },
  // Mentions
  mentions: {
    all: (page: number) => ['mentions', page] as const,
    count: ['mentions', 'count'] as const,
  },
};
