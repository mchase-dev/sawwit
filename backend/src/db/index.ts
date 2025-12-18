import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure postgres client with UTC timezone to ensure consistent timestamp handling
const client = postgres(process.env.DATABASE_URL!, {
  connection: {
    TimeZone: 'UTC',
  },
});

export const db = drizzle(client, { schema });
