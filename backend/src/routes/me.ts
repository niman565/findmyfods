import express, { Request, Response } from 'express';

import authMiddleware from '../middleware/auth_middleware';

const router = express.Router();

// Lets the frontend find out who is logged in, since it cannot read the HttpOnly cookie.
// The auth middleware has already confirmed the user exists.
router.get('/me', authMiddleware, (req: Request, res: Response) => {
    const { userId, username, email } = req.user!;

    res.json({ user: { id: userId, username, email } });
});

export default router;
