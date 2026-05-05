import express, { Request, Response } from 'express';

import { prisma } from '../prisma-lib';
import type { Prisma } from '../generated/prisma/client';
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

router.get('/recipes', async (req: Request, res: Response) => {
    const tagsQuery = req.query.tags;
    const searchQuery = req.query.search;

    const tagsArray =
        typeof tagsQuery === 'string'
            ? tagsQuery.split(',').map((t) => t.trim()).filter(Boolean)
            : Array.isArray(tagsQuery)
              ? tagsQuery
                    .filter((v): v is string => typeof v === 'string')
                    .flatMap((v) => v.split(',').map((t) => t.trim()))
                    .filter(Boolean)
              : [];

    const searchArray =
        typeof searchQuery === 'string'
            ? searchQuery.split(' ').map((t) => t.trim()).filter(Boolean)
            : Array.isArray(searchQuery)
              ? searchQuery
                    .filter((v): v is string => typeof v === 'string')
                    .flatMap((v) => v.split(',').map((t) => t.trim()))
                    .filter(Boolean)
              : [];
    
    const tagsQueryArray = tagsArray.map(tag => ({
        tags: {
            some: {
                tag: { name: tag },
            },
        },
    }));

    const where: Prisma.RecipeWhereInput = {};

    if (searchArray.length) {
        where.OR = searchArray.flatMap(term => [
            { title: { contains: term, mode: 'insensitive' } },
            { ingredientNames: { hasSome: [term.toLowerCase()] } },
        ]);
    }

    if (tagsArray.length) {
        where.AND = tagsQueryArray;
    }

    const recipes = await prisma.recipe.findMany({
        where,
        include: {
            tags: {
                include: {
                    tag: true
                }
            }
        }
    });

    res.status(200).send(recipes);
});

export default router;
