import express from 'express';

import LoginRouter from './login';
import LogoutRouter from './logout';
import MeRouter from './me';
import RegisterRouter from './register';

// Everything here is mounted under /api/auth.
const router = express.Router();

router.use(LoginRouter);
router.use(LogoutRouter);
router.use(MeRouter);
router.use(RegisterRouter);

export default router;
