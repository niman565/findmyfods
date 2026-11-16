import express, { Request, Response } from 'express';
import * as argon2 from "argon2";

import { startSession, toPublicUser } from '../lib/session';
import { prisma } from '../prisma-lib';
import { UserRegisterSchema } from './validation_schemas/User';

const router = express.Router();

router.post('/register', async (req: Request, res: Response) => {
    const { username, email, password } = UserRegisterSchema.parse(req.body);

    const passwordHash = await argon2.hash(password);

    const user = await prisma.user.create({
        data: {
            username,
            email,
            passwordHash,
        },
    });

    // A new user is logged in straight away.
    startSession(res, user);
    res.status(201).json({ user: toPublicUser(user) });
});

export default router;
