import express from 'express';

import FavoritesRouter from './favorites';
import LogoutRouter from './logout';

const router = express.Router();

router.use(FavoritesRouter);
router.use(LogoutRouter);

export default router;
