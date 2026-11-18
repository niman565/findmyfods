import express, { Request, Response } from 'express';

import { prisma } from '../prisma-lib';
import { UserFavoriteAddOrDeleteSchema } from './validation_schemas/User';

const router = express.Router();

// The user's favorite recipes, most recently added first. Each one has the
// same shape as a recipe from /api/recipes, including its tags.
router.get('/favorites', async (req: Request, res: Response) => {
    const { userId } = req.user!;

    const favorites = await prisma.favorite.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { recipeId: 'desc' }],
        include: {
            recipe: {
                include: {
                    tags: {
                        include: {
                            tag: true
                        }
                    }
                }
            }
        }
    });

    res.json(favorites.map(favorite => favorite.recipe));
});

router.post('/favorites/:recipeId', async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const { recipeId } = UserFavoriteAddOrDeleteSchema.parse({ recipeId: req.params.recipeId });

    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { id: true }
    });

    if (!recipe) {
        res.status(404).json({ error: 'No recipe found for provided id' });
        return;
    }

    // skipDuplicates makes this safe to repeat: favoriting a recipe that is
    // already a favorite changes nothing and is not an error.
    const { count } = await prisma.favorite.createMany({
        data: [{ userId, recipeId }],
        skipDuplicates: true
    });

    if (count === 0) {
        res.status(200).json({ message: 'Recipe was already favorited' });
        return;
    }

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
