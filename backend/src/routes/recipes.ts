import express, { Request, Response } from 'express';

import { prisma } from '../prisma-lib';
import { RecipeSpecificSchema } from './validation_schemas/Recipe';


const router = express.Router();

router.get('/recipe/:id', async(req: Request, res: Response) => {
    const id = RecipeSpecificSchema.parse({id: req.params.id});

    const recipe = await prisma.recipe.findUnique({
        where: id,
    });

    if (!recipe) {
        res.status(404).json({ error: "No recipe found for provided id" });
        return;
    }

    res.status(200).send(recipe);
});

router.get('/recipes', async(req: Request, res: Response) => {
    res.json({ message: "Reached this endpoint successfully" });
});

export default router;
