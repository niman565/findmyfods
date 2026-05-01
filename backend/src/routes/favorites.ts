import express, { Request, Response } from 'express';

import { prisma } from '../prisma-lib';
import { UserFavoriteAddOrDeleteSchema } from './validation_schemas/User';

const router = express.Router();

router.get('/favorites', async (req: Request, res: Response) => {
    const { userId, username } = req.user!;

    const user = await prisma.user.findUnique({
        where: { id: userId, username },
        include: { favorites: { include: { recipe: true } } }
    });

    if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
    }

    res.json(user.favorites);
});

router.post('/favorites/:recipeId', async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const { recipeId } = UserFavoriteAddOrDeleteSchema.parse({ recipeId: req.params.recipeId });

    await prisma.favorite.create({
        data: { userId, recipeId }
    });

    res.status(201).json({ message: 'Recipe has been successfully favorited' });
});

router.delete('/favorites/:recipeId', async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const { recipeId } = UserFavoriteAddOrDeleteSchema.parse({ recipeId: req.params.recipeId });

    await prisma.favorite.delete({
        where: { userId_recipeId: { userId, recipeId } }
    });

    res.status(200).json({ message: 'Recipe has been successfully un-favorited' });
});

export default router;
