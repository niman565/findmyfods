import express, { Request, Response } from 'express';
import * as argon2 from "argon2";
import * as jwt from "jsonwebtoken";

import { prisma } from '../prisma-lib';
import { UserLoginSchema } from './validation_schemas/User';

const secretKey = process.env.SECRET_KEY;
if (!secretKey) throw new Error('No secret key found');

const router = express.Router();

router.post('/login', async (req: Request, res: Response) => {
    const parsed = UserLoginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
        where: 'username' in parsed
            ? { username: parsed.username }
            : { email: parsed.email },
    });

    if (!user || !(await argon2.verify(user.passwordHash, parsed.password))) {
        res.status(401).send('Invalid credentials');
        return;
    }

    const payload = { username: user.username, uuid: user.id };
    const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });

    res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600 * 1000,
    });

    res.send('Logged in successfully!');
});

export default router;
