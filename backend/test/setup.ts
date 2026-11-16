import { afterAll } from 'vitest';
import { assertTestDatabase } from './helpers/assertTestDatabase';
import { readTestDatabaseUrl } from './helpers/testEnv';

// Runs in the test process before each test file is imported, so the app
// (and its Prisma client) has not connected to anything yet.
//
// DATABASE_URL is always taken from backend/.env.test, replacing any value
// already in the environment, and only after it passes the "_test" guard.
const testDatabaseUrl = readTestDatabaseUrl();
assertTestDatabase(testDatabaseUrl);
process.env.DATABASE_URL = testDatabaseUrl;

afterAll(async () => {
    const { prisma } = await import('../src/prisma-lib');
    await prisma.$disconnect();
});
