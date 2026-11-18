import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';

// Set as CLIENT_ORIGIN in vitest.config.mts.
const ALLOWED_ORIGIN = 'http://localhost:5173';

describe('CORS', () => {
    it('answers a preflight from the frontend origin and allows credentials', async () => {
        const res = await request(app)
            .options('/api/auth/login')
            .set('Origin', ALLOWED_ORIGIN)
            .set('Access-Control-Request-Method', 'POST')
            .set('Access-Control-Request-Headers', 'content-type');

        expect(res.status).toBe(204);
        expect(res.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN);
        expect(res.get('Access-Control-Allow-Credentials')).toBe('true');
        expect(res.get('Access-Control-Allow-Methods')).toContain('POST');
        expect(res.get('Access-Control-Allow-Methods')).toContain('DELETE');
        expect(res.get('Access-Control-Allow-Headers')).toContain('content-type');
    });

    it('adds the CORS headers to a normal request from the frontend origin', async () => {
        const res = await request(app).get('/api/tags').set('Origin', ALLOWED_ORIGIN);

        expect(res.status).toBe(200);
        expect(res.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN);
        expect(res.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('never answers with a wildcard origin', async () => {
        const res = await request(app).get('/api/tags').set('Origin', ALLOWED_ORIGIN);

        expect(res.get('Access-Control-Allow-Origin')).not.toBe('*');
    });

    it.each([
        'http://evil.example.com',
        'http://localhost:3000',
        'https://localhost:5173',
        'http://localhost:5173.evil.example.com',
    ])('gives no Allow-Origin header to %s', async (origin) => {
        const res = await request(app).get('/api/tags').set('Origin', origin);

        expect(res.get('Access-Control-Allow-Origin')).toBeUndefined();
    });

    it('gives no Allow-Origin header to a preflight from another origin', async () => {
        const res = await request(app)
            .options('/api/favorites/1')
            .set('Origin', 'http://evil.example.com')
            .set('Access-Control-Request-Method', 'POST');

        expect(res.get('Access-Control-Allow-Origin')).toBeUndefined();
    });

    it('still serves requests that have no Origin header, such as curl', async () => {
        const res = await request(app).get('/api/tags');

        expect(res.status).toBe(200);
        expect(res.get('Access-Control-Allow-Origin')).toBeUndefined();
    });
});

describe('CLIENT_ORIGIN setting', () => {
    const original = process.env.CLIENT_ORIGIN;

    afterEach(() => {
        process.env.CLIENT_ORIGIN = original;
        vi.resetModules();
    });

    it('still allows the frontend when the setting ends in a slash', async () => {
        process.env.CLIENT_ORIGIN = `${ALLOWED_ORIGIN}/`;
        vi.resetModules();
        // A fresh copy of the app that reads the changed setting. A preflight
        // never reaches the database, so this copy opens no connection.
        const { default: freshApp } = await import('../src/app');

        const res = await request(freshApp)
            .options('/api/auth/login')
            .set('Origin', ALLOWED_ORIGIN)
            .set('Access-Control-Request-Method', 'POST');

        expect(res.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN);
    });
});
