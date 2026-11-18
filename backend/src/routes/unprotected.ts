import express from 'express';

import AuthRouter from './auth';
import RecipeRouter from './recipes';
import TagsRouter from './tags';

const router = express.Router();

router.use('/auth', AuthRouter);
router.use(RecipeRouter);
router.use(TagsRouter);

export default router;
