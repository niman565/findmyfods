import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';
import { UserSchema } from './validation_schemas/User';

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const router = express.Router();

router.post('/register', async (req: Request, res: Response) => {
    const { username, email, password } = UserSchema.parse(req.body);

    await prisma.user.create({
        data: {
            username,
            email,
            passwordHash: password,
        },
    });
    res.status(201).json({ message: 'User created successfully' });
});

export default router;