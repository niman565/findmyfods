import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { createTestData } from './helpers/factories';

interface TagBody {
    id: number;
    name: string;
    category: string;
}

const data = createTestData();

// Two categories, created out of alphabetical order on purpose.
const categoryA = `${data.token} cat a`;
const categoryB = `${data.token} cat b`;

beforeAll(async () => {
    await data.tag('m', categoryB);
    await data.tag('x', categoryA);
    await data.tag('b', categoryB);
    await data.tag('c', categoryA);
});

afterAll(async () => {
    await data.cleanup();
});

/** The tags this file created, in the order the API returned them. */
async function ownTags(): Promise<TagBody[]> {
    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);
    return (res.body as TagBody[]).filter((tag) => tag.name.startsWith(data.token));
}

describe('GET /api/tags', () => {
    it('is public and returns every tag', async () => {
        const tags = await ownTags();

        expect(tags).toHaveLength(4);
    });

    it('returns only id, name and category for each tag', async () => {
        const [first] = await ownTags();

        expect(Object.keys(first).sort()).toEqual(['category', 'id', 'name']);
        expect(first).toEqual({
            id: expect.any(Number),
            name: expect.any(String),
            category: expect.any(String),
        });
    });

    it('sorts by category, then by name within a category', async () => {
        const tags = await ownTags();

        expect(tags.map((tag) => [tag.category, tag.name])).toEqual([
            [categoryA, `${data.token}-c`],
            [categoryA, `${data.token}-x`],
            [categoryB, `${data.token}-b`],
            [categoryB, `${data.token}-m`],
        ]);
    });

    it('returns tag names in lowercase', async () => {
        const tags = await ownTags();

        for (const tag of tags) {
            expect(tag.name).toBe(tag.name.toLowerCase());
        }
    });
});
