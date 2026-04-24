import express, { Request, Response } from 'express';
import * as argon2 from "argon2";
import * as jwt from "jsonwebtoken";

import { prisma } from '../prisma-lib';
import { UserRegisterSchema } from './validation_schemas/User';

const secretKey = process.env.SECRET_KEY;
if (!secretKey) throw new Error('No secret key found');

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
    res.status(201);

    const payload = { username: user.username, uuid: user.id };
    const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });  // Token expires in 1 hour

    res.cookie('auth_token', token, {
      httpOnly: true,   // Only accessible via HTTP request, not JavaScript
      secure: process.env.NODE_ENV === 'production',  // Only over HTTPS in production
      maxAge: 3600 * 1000 // Cookie expiration time (1 hour)
    });

    res.send('New user created and logged in successfully!');
});

export default router;