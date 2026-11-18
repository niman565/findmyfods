import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/prisma-lib';
import { registerUser } from './helpers/auth';
import { createTestData } from './helpers/factories';

interface RecipeBody {
    id: number;
    title: string;
    tags: { tag: { name: string } }[];
}

// Recipes are shared by every test and deleted at the end.
// Users are created inside each test and deleted after it, which also
// deletes their favorites.
const fixtures = createTestData();
const users = createTestData();

let soup: number, salad: number;
let tagName: string;

beforeAll(async () => {
    const tag = await fixtures.tag('quick');
    tagName = tag.name;
    soup = (await fixtures.recipe({ title: `${fixtures.t('soup')}`, tagIds: [tag.id] })).id;
    salad = (await fixtures.recipe({ title: `${fixtures.t('salad')}` })).id;
});

afterEach(async () => {
    await users.cleanup();
});

afterAll(async () => {
    await fixtures.cleanup();
});

const favoriteCount = (userId: number) => prisma.favorite.count({ where: { userId } });

describe('POST /api/favorites/:recipeId', () => {
    it('adds a favorite and returns 201', async () => {
        const { agent, user } = await registerUser(users, 'add');
        const res = await agent.post(`/api/favorites/${soup}`);

        expect(res.status).toBe(201);
        expect(await favoriteCount(user.id)).toBe(1);
    });

    it('returns 200 and adds nothing when the recipe is already a favorite', async () => {
        const { agent, user } = await registerUser(users, 'twice');
        await agent.post(`/api/favorites/${soup}`);

        const res = await agent.post(`/api/favorites/${soup}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: 'Recipe was already favorited' });
        expect(await favoriteCount(user.id)).toBe(1);
    });

    it('returns 404 for a recipe that does not exist', async () => {
        const { agent, user } = await registerUser(users, 'missing');
        const missingId = await fixtures.missingRecipeId();

        const res = await agent.post(`/api/favorites/${missingId}`);

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'No recipe found for provided id' });
        expect(await favoriteCount(user.id)).toBe(0);
    });

    it.each(['abc', '1.5', '0', '-1', '99999999999'])('returns 400 for the id "%s"', async (id) => {
        const { agent, user } = await registerUser(users, 'badid');
        const res = await agent.post(`/api/favorites/${id}`);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(await favoriteCount(user.id)).toBe(0);
    });
});

describe('GET /api/favorites', () => {
    it('returns an empty list for a user with no favorites', async () => {
        const { agent } = await registerUser(users, 'none');
        const res = await agent.get('/api/favorites');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('returns the recipes themselves, with their tags', async () => {
        const { agent } = await registerUser(users, 'shape');
        await agent.post(`/api/favorites/${soup}`);

        const res = await agent.get('/api/favorites');
        const detail = await request(app).get(`/api/recipe/${soup}`);

        expect(res.status).toBe(200);
        const body = res.body as RecipeBody[];
        expect(body).toHaveLength(1);
        expect(body[0].tags.map((link) => link.tag.name)).toEqual([tagName]);
        // Same shape as the recipe detail endpoint, with nothing about the favorite itself.
        expect(body[0]).toEqual(detail.body);
        expect(body[0]).not.toHaveProperty('recipe');
        expect(body[0]).not.toHaveProperty('userId');
    });

    it('lists the most recently added favorite first', async () => {
        const { agent, user } = await registerUser(users, 'order');
        // Written directly so the two favorites have known, different times.
        await prisma.favorite.create({
            data: { userId: user.id, recipeId: salad, createdAt: new Date('2026-01-01T00:00:00Z') },
        });
        await prisma.favorite.create({
            data: { userId: user.id, recipeId: soup, createdAt: new Date('2026-02-01T00:00:00Z') },
        });

        const res = await agent.get('/api/favorites');

        expect((res.body as RecipeBody[]).map((r) => r.id)).toEqual([soup, salad]);
    });

    it('shows each user only their own favorites', async () => {
        const alice = await registerUser(users, 'alice');
        const bob = await registerUser(users, 'bob');
        await alice.agent.post(`/api/favorites/${soup}`);
        await bob.agent.post(`/api/favorites/${salad}`);

        const aliceList = (await alice.agent.get('/api/favorites')).body as RecipeBody[];
        const bobList = (await bob.agent.get('/api/favorites')).body as RecipeBody[];

        expect(aliceList.map((r) => r.id)).toEqual([soup]);
        expect(bobList.map((r) => r.id)).toEqual([salad]);
    });
});

describe('DELETE /api/favorites/:recipeId', () => {
    it('removes a favorite', async () => {
        const { agent, user } = await registerUser(users, 'remove');
        await agent.post(`/api/favorites/${soup}`);

        const res = await agent.delete(`/api/favorites/${soup}`);

        expect(res.status).toBe(200);
        expect(await favoriteCount(user.id)).toBe(0);
        expect((await agent.get('/api/favorites')).body).toEqual([]);
    });

    it('removes only the favorite that was asked for', async () => {
        const { agent } = await registerUser(users, 'removeone');
        await agent.post(`/api/favorites/${soup}`);
        await agent.post(`/api/favorites/${salad}`);

        await agent.delete(`/api/favorites/${soup}`);

        const list = (await agent.get('/api/favorites')).body as RecipeBody[];
        expect(list.map((r) => r.id)).toEqual([salad]);
    });

    it('returns 404 for a recipe that is not a favorite', async () => {
        const { agent } = await registerUser(users, 'notfav');
        const res = await agent.delete(`/api/favorites/${soup}`);

        expect(res.status).toBe(404);
    });

    it('returns 404 when the favorite was already removed', async () => {
        const { agent } = await registerUser(users, 'removetwice');
        await agent.post(`/api/favorites/${soup}`);
        await agent.delete(`/api/favorites/${soup}`);

        const res = await agent.delete(`/api/favorites/${soup}`);

        expect(res.status).toBe(404);
    });

    it("cannot remove another user's favorite", async () => {
        const alice = await registerUser(users, 'owner');
        const bob = await registerUser(users, 'other');
        await alice.agent.post(`/api/favorites/${soup}`);

        const res = await bob.agent.delete(`/api/favorites/${soup}`);

        expect(res.status).toBe(404);
        expect(await favoriteCount(alice.user.id)).toBe(1);
    });

    it.each(['abc', '1.5', '0', '-1', '99999999999'])('returns 400 for the id "%s"', async (id) => {
        const { agent } = await registerUser(users, 'badid');
        const res = await agent.delete(`/api/favorites/${id}`);

        expect(res.status).toBe(400);
    });
});

describe('favorites and deleted data', () => {
    it('returns 401 on every route when the logged-in user no longer exists', async () => {
        const { agent, user } = await registerUser(users, 'gone');
        await prisma.user.delete({ where: { id: user.id } });

        expect((await agent.get('/api/favorites')).status).toBe(401);
        expect((await agent.post(`/api/favorites/${soup}`)).status).toBe(401);
        expect((await agent.delete(`/api/favorites/${soup}`)).status).toBe(401);
    });

    it('drops a favorite when its recipe is deleted', async () => {
        const { agent } = await registerUser(users, 'cascade');
        const temporary = await fixtures.recipe({ title: fixtures.t('temporary') });
        await agent.post(`/api/favorites/${temporary.id}`);

        await prisma.recipe.delete({ where: { id: temporary.id } });

        expect((await agent.get('/api/favorites')).body).toEqual([]);
    });
});
