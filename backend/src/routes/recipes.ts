import express, { Request, Response } from 'express';

import { prisma } from '../prisma-lib';
import { RecipeSpecificSchema } from './validation_schemas/Recipe';


const router = express.Router();

const secretKey = process.env.SECRET_KEY;
if (!secretKey) throw new Error('No secret key found');

router.get('/recipe/:id', async(req: Request, res: Response) => {
    const id = RecipeSpecificSchema.parse({id: req.params.id});

    const recipe = await prisma.recipe.findUnique({
        where: id,
    });

    if (!recipe) {
        res.status(400).send("No recipe found for provided id")
    }

    res.status(200).send(recipe);
});

router.get('/recipe', async(req: Request, res: Response) => {
    res.send("Reached this endpoint successfully");
});
