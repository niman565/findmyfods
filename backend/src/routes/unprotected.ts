import express from 'express';

import LoginRouter from './login';
import RecipeRouter from './recipes';
import RegisterRouter from './register';

const router = express.Router();

router.use(LoginRouter);
router.use(RecipeRouter);
router.use(RegisterRouter);

export default router;
