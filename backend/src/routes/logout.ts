import express, { Request, Response } from 'express';

import { endSession } from '../lib/session';

const router = express.Router();

// Public on purpose: logging out must work even when the cookie has expired
// or is invalid, so a stale cookie can always be removed.
router.post('/logout', (req: Request, res: Response) => {
    endSession(res);
    res.status(200).json({ message: 'Logged out successfully!' });
});

export default router;
