import jwt from 'jsonwebtoken';
import request, { Response } from 'supertest';
import app from '../../src/app';
import type { Credentials, TestData } from './factories';

export interface UserBody {
    id: number;
    username: string;
    email: string;
}

const AUTH_COOKIE_NAME = 'auth_token';

/**
 * Registers a new user through the API and returns a Supertest agent that
 * keeps the login cookie, so later requests made with it are logged in.
 */
export async function registerUser(data: TestData, label: string) {
    const credentials: Credentials = data.credentials(label);
    const agent = request.agent(app);

    const res = await agent.post('/api/auth/register').send(credentials);
    if (res.status !== 201) {
        throw new Error(`Test setup: register failed with ${res.status} ${JSON.stringify(res.body)}`);
    }

    const user = (res.body as { user: UserBody }).user;
    return { agent, user, credentials };
}

/** The Set-Cookie header line for the auth cookie, or undefined if the response did not set it. */
export function authSetCookie(res: Response): string | undefined {
    const header = res.get('Set-Cookie') as string[] | undefined;
    return header?.find((line) => line.startsWith(`${AUTH_COOKIE_NAME}=`));
}

/** A Cookie request header carrying the given token. */
export function cookieHeader(token: string): string {
    return `${AUTH_COOKIE_NAME}=${token}`;
}

/** Signs a token the way the app does, with options to make it expired or signed with another key. */
export function signToken(
    payload: Record<string, unknown>,
    options: { expiresInSeconds?: number; secret?: string } = {},
): string {
    const secret = options.secret ?? process.env.SECRET_KEY;
    if (!secret) throw new Error('Test setup: SECRET_KEY is not set');
    return jwt.sign(payload, secret, { expiresIn: options.expiresInSeconds ?? 60 });
}
