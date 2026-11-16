import express from 'express';

import AuthRouter from './auth';
import RecipeRouter from './recipes';

const router = express.Router();

router.use('/auth', AuthRouter);
router.use(RecipeRouter);

export default router;
