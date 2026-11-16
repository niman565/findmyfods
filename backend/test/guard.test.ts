import { describe, expect, it } from 'vitest';
import { assertTestDatabase } from './helpers/assertTestDatabase';

// The guard is what keeps tests away from the dev database, so it gets its
// own tests. These never connect to anything.
describe('assertTestDatabase', () => {
    it('accepts a database whose name ends in _test and returns the name', () => {
        expect(assertTestDatabase('postgresql://u:p@localhost:5432/recipe_app_test')).toBe('recipe_app_test');
        expect(assertTestDatabase('postgresql://u:p@localhost:5432/recipe_app_test?schema=public')).toBe('recipe_app_test');
    });

    it('rejects the dev database name', () => {
        expect(() => assertTestDatabase('postgresql://u:p@localhost:5432/recipe_app')).toThrow(/does not end in "_test"/);
    });

    it('rejects names that only contain "test" somewhere else', () => {
        expect(() => assertTestDatabase('postgresql://u:p@localhost:5432/test_recipe_app')).toThrow(/does not end in "_test"/);
        expect(() => assertTestDatabase('postgresql://u:p@localhost:5432/recipe_app_testing')).toThrow(/does not end in "_test"/);
    });

    it('rejects a "_test" host or user when the database name is not a test one', () => {
        expect(() => assertTestDatabase('postgresql://app_test:p@db_test:5432/recipe_app')).toThrow(/does not end in "_test"/);
    });

    it('rejects a missing, empty or malformed URL', () => {
        expect(() => assertTestDatabase(undefined)).toThrow(/DATABASE_URL is not set/);
        expect(() => assertTestDatabase('')).toThrow(/DATABASE_URL is not set/);
        expect(() => assertTestDatabase('not a url')).toThrow(/not a valid URL/);
        expect(() => assertTestDatabase('postgresql://u:p@localhost:5432/')).toThrow(/does not end in "_test"/);
    });
});
