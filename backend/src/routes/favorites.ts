import express, { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';

import { prisma } from '../prisma-lib';
import { UserFavoriteAddOrDeleteSchema } from './validation_schemas/User';

const router = express.Router();

const secretKey = process.env.SECRET_KEY;
if (!secretKey) throw new Error('No secret key found');

router.get('/favorites', async(req: Request, res: Response) => {
    const token = req.cookies?.auth_token;
    if (!token) {
        res.status(401).send('Not authenticated');
        return;
    }

    const {uuid: id, username} = jwt.verify(token, secretKey) as { username: string; uuid: number };

    const user = await prisma.user.findFirst({
        where: { id, username },
        include: { favorites: { include: { recipe: true } } }
    });

    if (!user) {
        res.status(401).send('User not found');
        return;
    }

    res.send(user.favorites);
});

router.post('/favorites/:recipeId', async (req: Request, res: Response) => {
    const token = req.cookies?.auth_token;
    const recipeId = req.params.recipeId;
    if (!token) {
        res.status(401).send('Not authenticated');
        return;
    }

    const { recipeId: parsedRecipeId } = UserFavoriteAddOrDeleteSchema.parse({recipeId})

    const {uuid: userId} = jwt.verify(token, secretKey) as { username: string; uuid: number };

    await prisma.favorite.create({
        data: { userId, recipeId: parsedRecipeId }
    })
    
    res.status(201).send("Recipe has been successfully favorited");
});

router.delete('/favorites/:recipeId', async (req: Request, res: Response) => {
    const token = req.cookies?.auth_token;
    const recipeId = req.params.recipeId;
    if (!token) {
        res.status(401).send('Not authenticated');
        return;
    }

    const { recipeId: parsedRecipeId } = UserFavoriteAddOrDeleteSchema.parse({recipeId})

    const {uuid: userId} = jwt.verify(token, secretKey) as { username: string; uuid: number };

    await prisma.favorite.delete({
        where: { userId_recipeId: { userId, recipeId: parsedRecipeId } }
    })

    res.status(200).send("Recipe has been successfully un-favorited");
});

export default router;
