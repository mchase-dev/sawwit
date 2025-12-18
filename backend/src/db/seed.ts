import { db } from './index';
import { users } from './schema';
import { hashPassword } from '../utils/password';
import { generateAvatarSeed } from '../utils/random';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config();

async function seed() {
  console.log('Seeding database...');

  try {
    // Check if superuser already exists
    const existingSuperuser = await db.query.users.findFirst({
      where: eq(users.email, 'superuser@example.com'),
    });

    if (existingSuperuser) {
      console.log('Superuser already exists. Skipping seed.');
      return;
    }

    // Create superuser
    const passwordHash = await hashPassword('Please_change_123!');

    await db.insert(users).values({
      username: 'superuser',
      email: 'superuser@example.com',
      passwordHash,
      isSuperuser: true,
      avatarStyle: 'bottts',
      avatarSeed: generateAvatarSeed(),
    });

    console.log('✓ Superuser created successfully!');
    console.log('  Email: superuser@example.com');
    console.log('  Password: Please_change_123!');
    console.log('  ⚠️  Please change the password after first login!');
    console.log('');
    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
