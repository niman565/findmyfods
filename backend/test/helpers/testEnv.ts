import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'dotenv';

const BACKEND_DIR = path.resolve(__dirname, '..', '..');

function readDatabaseUrl(file: string): string | undefined {
    const fullPath = path.join(BACKEND_DIR, file);
    if (!fs.existsSync(fullPath)) return undefined;
    return parse(fs.readFileSync(fullPath)).DATABASE_URL;
}

/** DATABASE_URL from backend/.env.test (the test database). */
export function readTestDatabaseUrl(): string | undefined {
    return readDatabaseUrl('.env.test');
}

/** DATABASE_URL from backend/.env (the dev database). Only used to compare, never to connect. */
export function readDevDatabaseUrl(): string | undefined {
    return readDatabaseUrl('.env');
}
