# Testing Guide

## Test Database Setup

### Overview

The project uses **SQLite** for testing, which provides fast, isolated test execution without requiring a PostgreSQL installation.

### Architecture

- **Production**: PostgreSQL with optimized schema (`src/db/schema.ts`)
- **Testing**: SQLite with compatible schema (`tests/setup/schema.sqlite.ts`)

### Benefits

- ✅ Fast test execution (in-memory or file-based)
- ✅ No PostgreSQL needed for CI/CD
- ✅ Isolated test environment
- ✅ Automatic setup and teardown

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

### Integration Tests

Located in `tests/` directory:

- `auth.test.ts` - Authentication endpoints
- `posts.test.ts` - Post CRUD operations
- `comments.test.ts` - Comment operations
- `votes.test.ts` - Voting system
- `topics.test.ts` - Topic management
- And more...

### Test Utilities

Located in `tests/utils/`:

**testDb.ts** - Database setup and teardown

```typescript
import { cleanDatabase, disconnectDatabase } from './utils/testDb';

beforeEach(async () => {
  await cleanDatabase(); // Clean slate for each test
});

afterAll(async () => {
  await disconnectDatabase(); // Cleanup
});
```

**testAuth.ts** - User creation and authentication

```typescript
import { createTestUser, registerAndLogin, getAuthHeader } from './utils/testAuth';

// Create a test user directly in DB
const user = await createTestUser('john', 'john@example.com');

// Register and login through API
const { token } = await registerAndLogin(app, 'jane', 'jane@example.com');

// Use token in requests
const res = await request(app)
  .get('/api/user/profile')
  .set(getAuthHeader(token));
```

**testHelpers.ts** - Helper functions

```typescript
import { generateUniqueEmail, generateUniqueUsername } from './utils/testHelpers';

const email = generateUniqueEmail(); // test-1234567890@example.com
const username = generateUniqueUsername(); // user_1234567890
```

## Writing Tests

### Example: Testing an Endpoint

```typescript
import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase } from './utils/testDb';
import { registerAndLogin, getAuthHeader } from './utils/testAuth';

describe('Posts API', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('should create a post', async () => {
    // Setup: Create authenticated user
    const { token } = await registerAndLogin(app);

    // Action: Create post
    const res = await request(app)
      .post('/api/posts')
      .set(getAuthHeader(token))
      .send({
        title: 'Test Post',
        content: 'This is a test post',
        topicName: 'general'
      });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.post).toHaveProperty('id');
    expect(res.body.post.title).toBe('Test Post');
  });
});
```

## Test Database Details

### SQLite Schema

The test schema (`tests/setup/schema.sqlite.ts`) mirrors the production PostgreSQL schema but uses SQLite-compatible types:

**Type Mappings:**

- PostgreSQL `uuid` → SQLite `TEXT`
- PostgreSQL `boolean` → SQLite `INTEGER` (0/1)
- PostgreSQL `timestamp with timezone` → SQLite `INTEGER` (Unix timestamp)
- PostgreSQL native enums → SQLite `TEXT`

### Data Types in Tests

When creating test data:

```typescript
import { v4 as uuidv4 } from 'uuid';

// Generate IDs
const id = uuidv4(); // "550e8400-e29b-41d4-a716-446655440000"

// Timestamps (Unix timestamp in seconds)
const now = Math.floor(Date.now() / 1000);

// Booleans (0 or 1 for SQLite)
const isActive = 1; // true
const isDeleted = 0; // false
```

## Troubleshooting

### Tests Fail to Initialize Database

**Error:** `Failed to initialize test database`

**Solution:** Ensure `better-sqlite3` is installed:

```bash
npm install --save-dev better-sqlite3 @types/better-sqlite3
```

### Foreign Key Constraint Errors

**Error:** `FOREIGN KEY constraint failed`

**Solution:** Ensure `cleanDatabase()` deletes tables in the correct order (child tables before parent tables). The order is already configured in `testDb.ts`.

### Timestamp Comparison Issues

**Issue:** Timestamp comparisons fail

**Solution:** SQLite stores timestamps as integers (Unix seconds). When comparing dates:

```typescript
const now = Math.floor(Date.now() / 1000);
expect(user.createdAt).toBeLessThanOrEqual(now);
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        # No PostgreSQL setup required! ✅
```

## Best Practices

1. **Clean database before each test**
   
   ```typescript
   beforeEach(async () => {
     await cleanDatabase();
   });
   ```

2. **Always disconnect after tests**
   
   ```typescript
   afterAll(async () => {
     await disconnectDatabase();
   });
   ```

3. **Use unique data for each test**
   
   ```typescript
   const email = generateUniqueEmail();
   const username = generateUniqueUsername();
   ```

4. **Test isolation**
   
   - Each test should be independent
   - Don't rely on data from previous tests
   - Clean database ensures a fresh slate

5. **Timeout configuration**
   
   - First test may take longer (database initialization)
   - Configure timeouts in Jest config or per-test

## Future Enhancements

- [ ] Add test data factories/fixtures
- [ ] Add test database seeding utilities
- [ ] Add transaction rollback support for faster cleanup
- [ ] Add performance benchmarks
