/**
 * Safety guard: throws unless the given connection URL points at a database
 * whose name ends in "_test". Called before any test code touches the
 * database, so a misconfigured run aborts instead of reaching the dev data.
 */
export function assertTestDatabase(url: string | undefined): string {
    if (!url) {
        throw new Error(
            'Tests aborted: DATABASE_URL is not set. It must come from backend/.env.test.'
        );
    }

    let dbName: string;
    try {
        dbName = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
    } catch {
        throw new Error('Tests aborted: DATABASE_URL in backend/.env.test is not a valid URL.');
    }

    if (!dbName.endsWith('_test')) {
        throw new Error(
            `Tests aborted: database "${dbName}" does not end in "_test". ` +
            'Tests only run against the separate test database.'
        );
    }

    return dbName;
}
