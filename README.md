# Sawwit - Community Discussion Platform

Sawwit is a tech demonstration for a Reddit-inspired community discussion platform built with Node.js, Express, React, Typescript, and PostgreSQL. This is a personal project, and not production ready. It is intended for educational purposes only.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Database](#database)
- [Testing](#testing)
- [Building for Production](#building-for-production)
- [Docker Deployment](#docker-deployment)
- [License](#license)

## Features

### Core Features

- **User Authentication** - Local auth with JWT tokens, optional OAuth support
- **Topic-Based Communities** - Create and join topic communities
- **Posts** - Text, link, and image posts with rich text editing
- **Nested Comments** - Threaded comment system with collapse/expand
- **Voting System** - Upvote/downvote with one vote per user constraint
- **Notifications** - Real-time notifications for comments, mentions, etc.

### Community Features

- **Topics** - Create, join, and manage community topics
- **Post Tags** - Topic-specific post tags (moderator-managed)
- **User Badges** - Moderator-awarded badges per topic
- **Trending** - Trending topics and posts algorithms
- **Search** - Global and topic-specific search

### Moderation Features

- **Report System** - Report posts and comments with moderation queue
- **Moderator Tools** - Pin, lock, delete posts/comments, ban users
- **Mod Log** - Public moderation log for transparency
- **Automod Rules** - Automated moderation with customizable rules

### Social Features

- **Direct Messages** - Private messaging with threading support
- **User Blocking** - Block users from content visibility
- **User Mentions** - @username mentions with notifications (max 5 per content)
- **Saved Posts** - Save posts for later viewing

### Content Safety

- **NSFW Content** - NSFW flag with blur overlay
- **Spoiler Content** - Spoiler flag with click-to-reveal
- **Content Reporting** - Report inappropriate content

### Reputation System

- **Post Cred** - Reputation from post votes
- **Comment Cred** - Reputation from comment votes
- **Sorting Algorithms** - Hot, Top, Rising, Controversial, Best (Wilson)

### User Management

- **User Profiles** - Customizable profiles with Dicebear avatars
- **Email Verification** - Optional email verification
- **Account Deletion** - GDPR-compliant account deletion
- **Terms Agreement** - Required ToS acceptance on registration

**⚠️ Important**: This is a **demonstration project**, not production-ready software.

## Tech Stack

### Backend

| Technology   | Purpose             |
| ------------ | ------------------- |
| Node.js      | Runtime environment |
| TypeScript   | Type safety         |
| Express.js 5 | Web framework       |
| Drizzle ORM  | Database ORM        |
| PostgreSQL   | Production database |
| Passport.js  | Authentication      |
| JWT          | Token-based auth    |
| Multer       | File uploads        |
| bcrypt       | Password hashing    |
| Helmet       | Security headers    |

### Frontend

| Technology      | Purpose           |
| --------------- | ----------------- |
| React 18        | UI library        |
| TypeScript      | Type safety       |
| Vite            | Build tool        |
| Ant Design 5    | UI components     |
| React Router 7  | Routing           |
| TanStack Query  | Data fetching     |
| React Hook Form | Form handling     |
| Zod             | Validation        |
| Axios           | HTTP client       |
| TipTap          | Rich text editor  |
| Dicebear        | Avatar generation |

### Testing

| Technology | Purpose           |
| ---------- | ----------------- |
| Jest       | Backend testing   |
| SQLite     | In-memory test DB |
| Supertest  | API testing       |
| Vitest     | Frontend testing  |

## Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 14+ (for production)
- **Git**

> **Note:** SQLite is used automatically for unit tests - no setup required.

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/mwchase-dev/sawwit.git
cd sawwit
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and configure:
# - DATABASE_URL (PostgreSQL connection string)
# - JWT_SECRET and JWT_REFRESH_SECRET
# - Other optional settings

# Run database migrations
npm run db:migrate

# Seed database with superuser and sample data
npm run db:seed

# Start development server
npm run dev
```

The backend API will be running at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment variables (optional, defaults work for local dev)
cp .env.example .env

# Start development server
npm run dev
```

The frontend will be running at `http://localhost:5173`

### 4. Access the Application

Open your browser and navigate to `http://localhost:5173`

**Default Credentials:**

| User      | Email                   | Password             |
| --------- | ----------------------- | -------------------- |
| Superuser | `superuser@example.com` | `Please_change_123!` |

> **Warning:** Change the superuser password immediately in production!

## Project Structure

```
sawwit/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration (multer, etc.)
│   │   ├── controllers/    # Route controllers (minimal)
│   │   ├── db/
│   │   │   ├── schema.ts   # Drizzle ORM schema
│   │   │   ├── index.ts    # Database connection
│   │   │   ├── seed.ts     # Seed script
│   │   │   └── migrations/ # Migration files
│   │   ├── middleware/     # Express middleware
│   │   │   ├── auth.ts     # JWT authentication
│   │   │   ├── permissions.ts # Role-based access
│   │   │   └── rateLimiter.ts # Rate limiting
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic layer
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utility functions
│   │   ├── index.ts        # Entry point
│   │   └── server.ts       # Express app setup
│   ├── tests/              # Test files
│   │   └── setup/          # Test configuration
│   ├── uploads/            # Local file storage
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/         # Static assets
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Third-party configs
│   │   ├── pages/          # Page components
│   │   ├── routes/         # Route definitions
│   │   ├── services/       # API service layer
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utility functions
│   │   ├── App.tsx         # Root component
│   │   └── main.tsx        # Entry point
│   ├── public/             # Static files
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                   # Documentation
│   ├── README.md           # This file
│   ├── API.md              # API reference
│   ├── DATABASE.md         # Database schema
│   ├── ARCHITECTURE.md     # System architecture
│   └── DEPLOYMENT.md       # Deployment guide
│
├── docker-compose.yml      # Docker configuration
├── IMPLEMENTATION_PLAN.md  # Implementation specs
└── TODO.md                 # Development checklist
```

## Configuration

### Backend Environment Variables

| Variable                 | Description                  | Default                 |
| ------------------------ | ---------------------------- | ----------------------- |
| `NODE_ENV`               | Environment mode             | `development`           |
| `PORT`                   | Server port                  | `5000`                  |
| `DATABASE_URL`           | PostgreSQL connection string | Required                |
| `JWT_SECRET`             | JWT signing secret           | Required                |
| `JWT_REFRESH_SECRET`     | Refresh token secret         | Required                |
| `JWT_EXPIRES_IN`         | Access token expiry          | `15m`                   |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry         | `7d`                    |
| `STORAGE_PROVIDER`       | Storage type (`local`/`s3`)  | `local`                 |
| `UPLOAD_DIR`             | Local upload directory       | `./uploads`             |
| `CORS_ORIGIN`            | Allowed CORS origin          | `http://localhost:5173` |
| `BCRYPT_SALT_ROUNDS`     | Password hashing rounds      | `10`                    |
| `MAX_FILE_SIZE`          | Max upload size (bytes)      | `5242880` (5MB)         |

See `.env.example` for full configuration including OAuth and email settings.

### Frontend Environment Variables

| Variable            | Description          | Default                     |
| ------------------- | -------------------- | --------------------------- |
| `VITE_API_URL`      | Backend API URL      | `http://localhost:5000/api` |
| `VITE_APP_NAME`     | Application name     | `Sawwit`                    |
| `VITE_ENABLE_OAUTH` | Enable OAuth buttons | `true`                      |

## Database

### Production Database

- **PostgreSQL 14+** is required for production
- Schema defined in `backend/src/db/schema.ts`
- Uses Drizzle ORM with native PostgreSQL features (UUIDs, enums, indexes)

### Test Database

- **SQLite** in-memory database for fast, isolated testing
- Automatically configured when running tests
- No PostgreSQL required for development testing

### Database Commands

```bash
cd backend

# Generate new migration
npm run db:generate

# Run migrations
npm run db:migrate

# Push schema changes (dev only)
npm run db:push

# Open Drizzle Studio
npm run db:studio

# Seed database
npm run db:seed
```

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm test:coverage

# Run tests in watch mode
npm test:watch
```

**Test Coverage:** 415 tests across 17 test suites covering:

- Authentication & authorization
- Topics, posts, comments
- Voting & notifications
- Tags, badges, reports
- Direct messages & blocking
- Moderation log & automod
- Mentions & permissions

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run tests with UI
npm test:ui

# Run tests with coverage
npm test:coverage
```

## Building for Production

### Backend

```bash
cd backend
npm run build    # Compile TypeScript
npm start        # Start production server
```

### Frontend

```bash
cd frontend
npm run build    # Build for production
npm run preview  # Preview production build
```

## Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services:

- `sawwit-db` - PostgreSQL database (port 5432)
- `sawwit-backend` - Backend API (port 3001)
- `sawwit-frontend` - Frontend (port 80)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## License

MIT License - see LICENSE file for details.

---

For questions or issues, please open a GitHub issue.
