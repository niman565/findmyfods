import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
        // Aborts the run unless backend/.env.test points at a "_test" database.
        globalSetup: ['./test/globalSetup.ts'],
        // Sets DATABASE_URL from backend/.env.test before each test file loads.
        setupFiles: ['./test/setup.ts'],
        // All test files share one database, so run them one at a time.
        fileParallelism: false,
        env: {
            // Test-only signing key. The app never loads backend/.env during
            // tests (only src/index.ts does), so the dev key is not used.
            SECRET_KEY: 'test-only-secret-never-used-outside-tests',
            // The origin the CORS tests treat as the allowed frontend.
            CLIENT_ORIGIN: 'http://localhost:5173',
        },
    },
});
