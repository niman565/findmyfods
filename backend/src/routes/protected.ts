import express from 'express';

import FavoritesRouter from './favorites';
import authMiddleware from '../middleware/auth_middleware';

const router = express.Router();

// The login check applies to the favorites routes only, so other unknown
// /api paths fall through to the 404 handler instead of returning 401.
router.use('/favorites', authMiddleware);
router.use(FavoritesRouter);

export default router;
