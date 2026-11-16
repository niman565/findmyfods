import express, { Request, Response } from 'express';

import { endSession, toPublicUser } from '../lib/session';
import authMiddleware from '../middleware/auth_middleware';
import { prisma } from '../prisma-lib';

const router = express.Router();

// Lets the frontend find out who is logged in, since it cannot read the HttpOnly cookie.
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    const { userId } = req.user!;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
        // The token is valid but its user no longer exists.
        endSession(res);
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    res.json({ user: toPublicUser(user) });
});

export default router;
