import { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Fails at startup, not on the first login, if the signing key is missing.
function requireSecretKey(): string {
    const key = process.env.SECRET_KEY;
    if (!key) throw new Error('No secret key found');
    return key;
}

const secretKey = requireSecretKey();

export const AUTH_COOKIE = 'auth_token';

// Users stay logged in between visits: the token and the cookie both last 7 days.
const SESSION_SECONDS = 7 * 24 * 60 * 60;

const SessionPayloadSchema = z.object({
    userId: z.number().int().positive(),
    username: z.string().min(1),
});

export type SessionPayload = z.infer<typeof SessionPayloadSchema>;

/** The user fields that are safe to send to the browser. Never includes the password hash. */
export interface PublicUser {
    id: number;
    username: string;
    email: string;
}

export function toPublicUser(user: PublicUser): PublicUser {
    return { id: user.id, username: user.username, email: user.email };
}

// Shared by setting and clearing the cookie: a browser only removes a cookie
// when these attributes match the ones it was set with.
const cookieOptions: CookieOptions = {
    httpOnly: true,                                  // not readable from JavaScript
    secure: process.env.NODE_ENV === 'production',   // HTTPS only in production
    sameSite: 'lax',
    path: '/',
};

/** Signs a session token for the user and sets it as the HttpOnly auth cookie. */
export function startSession(res: Response, user: { id: number; username: string }): void {
    const payload: SessionPayload = { userId: user.id, username: user.username };
    const token = jwt.sign(payload, secretKey, { expiresIn: SESSION_SECONDS });

    res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: SESSION_SECONDS * 1000 });
}

/** Removes the auth cookie. Safe to call when there is no cookie. */
export function endSession(res: Response): void {
    res.clearCookie(AUTH_COOKIE, cookieOptions);
}

/** Returns the session payload, or null if the token is missing, invalid, expired or malformed. */
export function readSessionToken(token: unknown): SessionPayload | null {
    if (typeof token !== 'string' || !token) return null;

    try {
        const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });
        const parsed = SessionPayloadSchema.safeParse(decoded);
        return parsed.success ? parsed.data : null;
    } catch {
        return null;
    }
}
