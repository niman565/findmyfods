import express, { Request, Response } from 'express';

import { prisma } from '../prisma-lib';

const router = express.Router();

// Every tag, grouped by category and alphabetical within each one,
// for building the filter panel.
router.get('/tags', async (req: Request, res: Response) => {
    const tags = await prisma.tag.findMany({
        select: { id: true, name: true, category: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    res.status(200).json(tags);
});

export default router;
