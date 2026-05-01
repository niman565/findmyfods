import express, { Request, Response } from 'express';

import { prisma } from '../prisma-lib';

const router = express.Router();

router.post('/logout', async (req: Request, res: Response) => {
    const { userId, username } = req.user!;

    // Verify user exists
    const user = await prisma.user.findUnique({
        where: { id: userId, username }
    });

    if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
    }

    // Clear cookie
    res.clearCookie('auth_token');
    res.status(200).json({ message: 'Logged out successfully!' });
});

export default router;
