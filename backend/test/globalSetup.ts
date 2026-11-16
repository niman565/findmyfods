import { assertTestDatabase } from './helpers/assertTestDatabase';
import { readDevDatabaseUrl, readTestDatabaseUrl } from './helpers/testEnv';

/**
 * Runs once, before any test file is loaded. Aborts the whole run unless
 * backend/.env.test points at a "_test" database that is not the dev one.
 *
 * The schema is NOT applied here. Run ./setup-test-db.sh from the repo root
 * after adding a migration.
 */
export default function globalSetup(): void {
    const testUrl = readTestDatabaseUrl();
    const dbName = assertTestDatabase(testUrl);

    if (testUrl === readDevDatabaseUrl()) {
        throw new Error(
            'Tests aborted: backend/.env.test has the same DATABASE_URL as backend/.env (the dev database).'
        );
    }

    console.log(`Running tests against database "${dbName}"`);
}
