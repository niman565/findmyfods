import express from 'express';

import FavoritesRouter from './favorites';

const router = express.Router();

router.use(FavoritesRouter);

export default router;
