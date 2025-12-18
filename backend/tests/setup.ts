// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';

// Use SQLite file-based database for tests (fast and isolated)
process.env.DATABASE_URL = 'file:./test.db';

// Increase timeout for database operations
jest.setTimeout(10000);
