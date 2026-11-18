import 'express';

declare module 'express' {
    interface Request {
        // Set by the auth middleware once the token's user is confirmed to exist.
        user?: { userId: number; username: string; email: string }
    }
}
