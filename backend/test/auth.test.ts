import { afterEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/prisma-lib';
import { authSetCookie, cookieHeader, registerUser, signToken, UserBody } from './helpers/auth';
import { createTestData } from './helpers/factories';

const data = createTestData();

// Every test creates its own users; they are deleted after each test.
afterEach(async () => {
    await data.cleanup();
});

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

describe('POST /api/auth/register', () => {
    it('creates the user, returns it and logs them in', async () => {
        const credentials = data.credentials('new');
        const res = await request(app).post('/api/auth/register').send(credentials);

        expect(res.status).toBe(201);
        const { user } = res.body as { user: UserBody };
        expect(user).toEqual({
            id: expect.any(Number),
            username: credentials.username,
            email: credentials.email,
        });
        expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
    });

    it('sets an HttpOnly, SameSite=Lax cookie that lasts 7 days', async () => {
        const res = await request(app).post('/api/auth/register').send(data.credentials('cookie'));

        const cookie = authSetCookie(res);
        expect(cookie).toBeDefined();
        expect(cookie).toMatch(/;\s*HttpOnly/i);
        expect(cookie).toMatch(/;\s*SameSite=Lax/i);
        expect(cookie).toMatch(/;\s*Path=\//i);
        expect(cookie).toContain(`Max-Age=${SEVEN_DAYS_IN_SECONDS}`);
    });

    it('issues a token that expires in 7 days', async () => {
        const res = await request(app).post('/api/auth/register').send(data.credentials('token'));

        const token = authSetCookie(res)?.split(';')[0].split('=')[1] ?? '';
        const decoded = jwt.decode(token) as { iat: number; exp: number; userId: number };
        expect(decoded.exp - decoded.iat).toBe(SEVEN_DAYS_IN_SECONDS);
        expect(decoded.userId).toBe((res.body as { user: UserBody }).user.id);
    });

    it('never returns the password or its hash', async () => {
        const credentials = data.credentials('nohash');
        const res = await request(app).post('/api/auth/register').send(credentials);

        const text = JSON.stringify(res.body);
        expect(text).not.toContain('passwordHash');
        expect(text).not.toContain('argon2');
        expect(text).not.toContain(credentials.password);
    });

    it('stores the password as an Argon2id hash, not as plain text', async () => {
        const credentials = data.credentials('hash');
        await request(app).post('/api/auth/register').send(credentials);

        const stored = await prisma.user.findUnique({ where: { username: credentials.username } });
        expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);
        expect(stored?.passwordHash).not.toContain(credentials.password);
    });

    it('accepts a password of exactly 8 characters', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...data.credentials('eight'), password: '12345678' });

        expect(res.status).toBe(201);
    });

    it.each([
        ['an invalid email', { email: 'not-an-email' }],
        ['a 7-character password', { password: '1234567' }],
        ['an empty username', { username: '' }],
        ['no username', { username: undefined }],
        ['no email', { email: undefined }],
        ['no password', { password: undefined }],
    ])('returns 400 for %s and creates nothing', async (_name, override) => {
        const credentials = data.credentials('invalid');
        const res = await request(app).post('/api/auth/register').send({ ...credentials, ...override });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(authSetCookie(res)).toBeUndefined();
        expect(await prisma.user.count({ where: { email: credentials.email } })).toBe(0);
    });

    it('returns 400 when there is no request body', async () => {
        const res = await request(app).post('/api/auth/register');

        expect(res.status).toBe(400);
        expect(authSetCookie(res)).toBeUndefined();
    });

    it('returns 400 when the body is not valid JSON', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .set('Content-Type', 'application/json')
            .send('{"username":');

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'Request body is not valid JSON' });
    });

    it('returns 409 when the username is already taken', async () => {
        const { credentials } = await registerUser(data, 'dupname');
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...data.credentials('other'), username: credentials.username });

        expect(res.status).toBe(409);
        expect(authSetCookie(res)).toBeUndefined();
    });

    it('returns 409 when the email is already taken', async () => {
        const { credentials } = await registerUser(data, 'dupmail');
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...data.credentials('other'), email: credentials.email });

        expect(res.status).toBe(409);
        expect(authSetCookie(res)).toBeUndefined();
    });
});

describe('POST /api/auth/login', () => {
    it('logs in with a username', async () => {
        const { credentials, user } = await registerUser(data, 'byname');
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: credentials.username, password: credentials.password });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ user });
        expect(authSetCookie(res)).toContain(`Max-Age=${SEVEN_DAYS_IN_SECONDS}`);
        expect(authSetCookie(res)).toMatch(/;\s*HttpOnly/i);
    });

    it('logs in with an email', async () => {
        const { credentials, user } = await registerUser(data, 'bymail');
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: credentials.email, password: credentials.password });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ user });
        expect(authSetCookie(res)).toBeDefined();
    });

    it('returns the same 401 for a wrong password and for an unknown user', async () => {
        const { credentials } = await registerUser(data, 'wrongpw');

        const wrongPassword = await request(app)
            .post('/api/auth/login')
            .send({ username: credentials.username, password: 'not-the-password' });
        const unknownUser = await request(app)
            .post('/api/auth/login')
            .send({ username: data.t('nobody'), password: credentials.password });

        expect(wrongPassword.status).toBe(401);
        expect(unknownUser.status).toBe(401);
        expect(wrongPassword.body).toEqual({ error: 'Invalid credentials' });
        expect(unknownUser.body).toEqual(wrongPassword.body);
        expect(authSetCookie(wrongPassword)).toBeUndefined();
        expect(authSetCookie(unknownUser)).toBeUndefined();
    });

    it.each([
        ['no password', { username: 'someone' }],
        ['neither username nor email', { password: 'password123' }],
        ['an invalid email', { email: 'not-an-email', password: 'password123' }],
        ['an empty body', {}],
    ])('returns 400 for %s', async (_name, body) => {
        const res = await request(app).post('/api/auth/login').send(body);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(authSetCookie(res)).toBeUndefined();
    });

    it('returns 400 when the body is not valid JSON', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send('not json');

        expect(res.status).toBe(400);
    });
});

describe('GET /api/auth/me', () => {
    it('returns the logged-in user', async () => {
        const { agent, user } = await registerUser(data, 'me');
        const res = await agent.get('/api/auth/me');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ user });
        expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('returns 401 without a cookie', async () => {
        const res = await request(app).get('/api/auth/me');

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    it('returns 401 for a token that is not a JWT', async () => {
        const res = await request(app).get('/api/auth/me').set('Cookie', cookieHeader('garbage'));

        expect(res.status).toBe(401);
    });

    it('returns 401 for an expired token', async () => {
        const { user } = await registerUser(data, 'expired');
        const token = signToken({ userId: user.id, username: user.username }, { expiresInSeconds: -60 });
        const res = await request(app).get('/api/auth/me').set('Cookie', cookieHeader(token));

        expect(res.status).toBe(401);
    });

    it('returns 401 for a token signed with a different key', async () => {
        const { user } = await registerUser(data, 'forged');
        const token = signToken({ userId: user.id, username: user.username }, { secret: 'some-other-key' });
        const res = await request(app).get('/api/auth/me').set('Cookie', cookieHeader(token));

        expect(res.status).toBe(401);
    });

    it('returns 401 for an unsigned token', async () => {
        const { user } = await registerUser(data, 'unsigned');
        const token = jwt.sign({ userId: user.id, username: user.username }, '', { algorithm: 'none' });
        const res = await request(app).get('/api/auth/me').set('Cookie', cookieHeader(token));

        expect(res.status).toBe(401);
    });

    it('returns 401 for a correctly signed token with the wrong contents', async () => {
        const token = signToken({ userId: 'not-a-number' });
        const res = await request(app).get('/api/auth/me').set('Cookie', cookieHeader(token));

        expect(res.status).toBe(401);
    });

    it('returns 401 when the token names a different user than the one with that id', async () => {
        // What a token from before a database reset looks like: a real id, but
        // the username belongs to whoever had that id before.
        const { user } = await registerUser(data, 'reused');
        const token = signToken({ userId: user.id, username: data.t('previous-owner') });
        const res = await request(app).get('/api/auth/me').set('Cookie', cookieHeader(token));

        expect(res.status).toBe(401);
        expect(authSetCookie(res)).toMatch(/^auth_token=;/);
    });

    it('returns 401 and clears the cookie when the user no longer exists', async () => {
        const { agent, user } = await registerUser(data, 'deleted');
        await prisma.user.delete({ where: { id: user.id } });

        const res = await agent.get('/api/auth/me');

        expect(res.status).toBe(401);
        expect(authSetCookie(res)).toMatch(/^auth_token=;/);
    });
});

describe('POST /api/auth/logout', () => {
    it('clears the cookie, after which the user is logged out', async () => {
        const { agent } = await registerUser(data, 'logout');
        expect((await agent.get('/api/auth/me')).status).toBe(200);

        const res = await agent.post('/api/auth/logout');

        expect(res.status).toBe(200);
        const cookie = authSetCookie(res);
        expect(cookie).toMatch(/^auth_token=;/);
        expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
        expect((await agent.get('/api/auth/me')).status).toBe(401);
    });

    it('succeeds without a cookie', async () => {
        const res = await request(app).post('/api/auth/logout');

        expect(res.status).toBe(200);
        expect(authSetCookie(res)).toMatch(/^auth_token=;/);
    });

    it('succeeds and clears the cookie when the token is invalid or expired', async () => {
        const expired = signToken({ userId: 1, username: 'x' }, { expiresInSeconds: -60 });

        for (const token of ['garbage', expired]) {
            const res = await request(app).post('/api/auth/logout').set('Cookie', cookieHeader(token));
            expect(res.status).toBe(200);
            expect(authSetCookie(res)).toMatch(/^auth_token=;/);
        }
    });

    it('lets the user log in again afterwards', async () => {
        const { agent, credentials } = await registerUser(data, 'relogin');
        await agent.post('/api/auth/logout');

        const res = await agent
            .post('/api/auth/login')
            .send({ username: credentials.username, password: credentials.password });

        expect(res.status).toBe(200);
        expect((await agent.get('/api/auth/me')).status).toBe(200);
    });
});

describe('route protection', () => {
    it.each([
        ['get', '/api/favorites'],
        ['post', '/api/favorites/1'],
        ['delete', '/api/favorites/1'],
    ] as const)('%s %s returns 401 without a cookie', async (method, path) => {
        const res = await request(app)[method](path);

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    it('lets a logged-in user reach the favorites routes', async () => {
        const { agent } = await registerUser(data, 'favs');
        const res = await agent.get('/api/favorites');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('rejects the favorites routes with an expired token', async () => {
        const { user } = await registerUser(data, 'favexpired');
        const token = signToken({ userId: user.id, username: user.username }, { expiresInSeconds: -60 });
        const res = await request(app).get('/api/favorites').set('Cookie', cookieHeader(token));

        expect(res.status).toBe(401);
    });
});

describe('unknown API routes', () => {
    it.each([
        ['get', '/api/nope'],
        ['post', '/api/auth/nope'],
        ['get', '/api/auth'],
    ] as const)('%s %s returns a JSON 404, not a 401', async (method, path) => {
        const res = await request(app)[method](path);

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Not found' });
    });

    it.each(['/api/login', '/api/register', '/api/logout'])(
        'the old path %s is gone',
        async (path) => {
            const res = await request(app).post(path).send({});
            expect(res.status).toBe(404);
        },
    );
});
