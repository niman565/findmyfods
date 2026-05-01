import 'express';

declare module 'express' {
    interface Request {
        user?: { username: string; userId: number }
    }
}
