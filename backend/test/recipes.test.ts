import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { createTestData } from './helpers/factories';

interface TagLink {
    tag: { id: number; name: string; category: string };
}
interface RecipeBody {
    id: number;
    title: string;
    ingredientNames: string[];
    tags: TagLink[];
}

const data = createTestData();

// Three tags (a, b, c) and three recipes, read by every test and deleted at the end:
//   soup:  tags a + b, ingredients kale, salt
//   salad: tag a,      ingredient rice
//   bowl:  tags b + c, ingredient kale
let tagA: string, tagB: string, tagC: string;
let soup: number, salad: number, bowl: number;

beforeAll(async () => {
    const [a, b, c] = await Promise.all([data.tag('a'), data.tag('b'), data.tag('c')]);
    [tagA, tagB, tagC] = [a.name, b.name, c.name];

    soup = (await data.recipe({
        title: `${data.t('alpha')} Soup`,
        ingredientNames: [data.t('kale'), 'salt'],
        tagIds: [a.id, b.id],
    })).id;
    salad = (await data.recipe({
        title: `${data.t('beta')} Salad`,
        ingredientNames: [data.t('rice')],
        tagIds: [a.id],
    })).id;
    bowl = (await data.recipe({
        title: `${data.t('gamma')} Bowl`,
        ingredientNames: [data.t('kale')],
        tagIds: [b.id, c.id],
    })).id;
});

afterAll(async () => {
    await data.cleanup();
});

/** GETs /api/recipes with the given query and returns the matching recipe ids, sorted. */
async function listIds(query: Record<string, string>): Promise<number[]> {
    const res = await request(app).get('/api/recipes').query(query);
    expect(res.status).toBe(200);
    return (res.body as RecipeBody[]).map((r) => r.id).sort((x, y) => x - y);
}

const sorted = (...ids: number[]) => [...ids].sort((x, y) => x - y);

describe('GET /api/recipes', () => {
    it('lists recipes with their tags', async () => {
        const res = await request(app).get('/api/recipes');

        expect(res.status).toBe(200);
        const body = res.body as RecipeBody[];
        const found = body.find((r) => r.id === soup);
        expect(found).toBeDefined();
        expect(found?.title).toBe(`${data.t('alpha')} Soup`);
        expect(found?.ingredientNames).toEqual([data.t('kale'), 'salt']);
        expect(found?.tags.map((link) => link.tag.name).sort()).toEqual([tagA, tagB].sort());
        expect(body.map((r) => r.id)).toEqual(expect.arrayContaining([soup, salad, bowl]));
    });

    it('treats empty tags and search parameters as no filter', async () => {
        const ids = await listIds({ tags: '', search: '' });
        expect(ids).toEqual(expect.arrayContaining([soup, salad, bowl]));
    });

    describe('?tags (AND logic)', () => {
        it('returns every recipe that has a single tag', async () => {
            expect(await listIds({ tags: tagA })).toEqual(sorted(soup, salad));
        });

        it('returns only recipes that have ALL the given tags', async () => {
            expect(await listIds({ tags: `${tagA},${tagB}` })).toEqual([soup]);
        });

        it('returns nothing when no recipe has every tag', async () => {
            expect(await listIds({ tags: `${tagA},${tagC}` })).toEqual([]);
        });

        it('returns nothing for a tag that does not exist', async () => {
            expect(await listIds({ tags: data.t('-no-such-tag') })).toEqual([]);
        });

        it('ignores spaces and empty entries in the tag list', async () => {
            expect(await listIds({ tags: ` ${tagA} , ,${tagB},` })).toEqual([soup]);
        });
    });

    describe('?search (OR logic across title and ingredient names)', () => {
        it('matches a word in the title', async () => {
            expect(await listIds({ search: data.t('alpha') })).toEqual([soup]);
        });

        it('matches part of a title, ignoring case', async () => {
            expect(await listIds({ search: data.t('alp').toUpperCase() })).toEqual([soup]);
        });

        it('matches an ingredient name, ignoring case', async () => {
            expect(await listIds({ search: data.t('kale').toUpperCase() })).toEqual(sorted(soup, bowl));
        });

        it('returns recipes matching ANY of several terms', async () => {
            const ids = await listIds({ search: `${data.t('alpha')} ${data.t('beta')}` });
            expect(ids).toEqual(sorted(soup, salad));
        });

        it('combines a title match and an ingredient match', async () => {
            const ids = await listIds({ search: `${data.t('beta')} ${data.t('kale')}` });
            expect(ids).toEqual(sorted(soup, salad, bowl));
        });

        it('returns nothing when no term matches', async () => {
            expect(await listIds({ search: data.t('nothingmatches') })).toEqual([]);
        });
    });

    describe('?tags and ?search together', () => {
        it('requires the tags AND at least one search term', async () => {
            expect(await listIds({ tags: tagA, search: data.t('kale') })).toEqual([soup]);
            expect(await listIds({ tags: tagB, search: data.t('kale') })).toEqual(sorted(soup, bowl));
        });

        it('returns nothing when the search matches but the tags do not', async () => {
            expect(await listIds({ tags: tagC, search: data.t('alpha') })).toEqual([]);
        });
    });
});

describe('GET /api/recipe/:id', () => {
    it('returns one recipe with its tags', async () => {
        const res = await request(app).get(`/api/recipe/${bowl}`);

        expect(res.status).toBe(200);
        const body = res.body as RecipeBody;
        expect(body.id).toBe(bowl);
        expect(body.title).toBe(`${data.t('gamma')} Bowl`);
        expect(body.tags.map((link) => link.tag.name).sort()).toEqual([tagB, tagC].sort());
    });

    it('returns 404 for an id that does not exist', async () => {
        const missingId = await data.missingRecipeId();
        const res = await request(app).get(`/api/recipe/${missingId}`);

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'No recipe found for provided id' });
    });

    it('returns 400 for an id that is not a number', async () => {
        const res = await request(app).get('/api/recipe/abc');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });
});
