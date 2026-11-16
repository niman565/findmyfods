import express, { Request, Response } from 'express';
import * as argon2 from "argon2";

import { startSession, toPublicUser } from '../lib/session';
import { prisma } from '../prisma-lib';
import { UserLoginSchema } from './validation_schemas/User';

const router = express.Router();

router.post('/login', async (req: Request, res: Response) => {
    const parsed = UserLoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
        where: 'username' in parsed
            ? { username: parsed.username }
            : { email: parsed.email },
    });

    if (!user || !(await argon2.verify(user.passwordHash, parsed.password))) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }

    startSession(res, user);
    res.json({ user: toPublicUser(user) });
});

export default router;
