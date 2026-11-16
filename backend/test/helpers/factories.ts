import { randomBytes } from 'node:crypto';
import { prisma } from '../../src/prisma-lib';

export interface Credentials {
    username: string;
    email: string;
    password: string;
}

interface RecipeInput {
    title: string;
    ingredientNames?: string[];
    tagIds?: number[];
}

/**
 * Creates test rows and removes them again. Recipes and tags are tracked by
 * id; users are found by the token in their username and email. cleanup()
 * deletes exactly those rows and nothing else.
 *
 * Every name built with t() carries a random token unique to this instance.
 * Filtering or searching by those names can therefore only match rows this
 * test file created, whatever else is in the database.
 */
export type TestData = ReturnType<typeof createTestData>;

export function createTestData() {
    const token = `t${randomBytes(4).toString('hex')}`;
    const recipeIds: number[] = [];
    const tagIds: number[] = [];

    return {
        token,

        /** Prefixes a label with this instance's unique token, e.g. "t3fa9c1b2alpha". */
        t(label: string): string {
            return `${token}${label}`;
        },

        /**
         * Builds a unique username, email and password. Nothing is created here;
         * pass them to the register endpoint. cleanup() deletes any user whose
         * username or email starts with this instance's token.
         */
        credentials(label: string): Credentials {
            return {
                username: `${token}${label}`,
                email: `${token}${label}@example.com`,
                password: 'password123',
            };
        },

        async tag(label: string, category = 'Test Category') {
            const tag = await prisma.tag.create({
                data: { name: `${token}-${label}`.toLowerCase(), category },
            });
            tagIds.push(tag.id);
            return tag;
        },

        async recipe({ title, ingredientNames = [], tagIds: recipeTagIds = [] }: RecipeInput) {
            const recipe = await prisma.recipe.create({
                data: {
                    title,
                    description: 'Created by a backend test.',
                    ingredients: ingredientNames,
                    ingredientNames,
                    instructions: ['Test step.'],
                    tags: { create: recipeTagIds.map((tagId) => ({ tagId })) },
                },
            });
            recipeIds.push(recipe.id);
            return recipe;
        },

        /** Deletes a recipe now and returns its id, which is then guaranteed not to exist. */
        async missingRecipeId(): Promise<number> {
            const recipe = await this.recipe({ title: `${token} deleted` });
            await prisma.recipe.delete({ where: { id: recipe.id } });
            return recipe.id;
        },

        /**
         * Deletes everything this instance created. Recipe-tag links go with
         * their recipe, and favorites go with their user.
         */
        async cleanup(): Promise<void> {
            await prisma.user.deleteMany({
                where: {
                    OR: [
                        { username: { startsWith: token } },
                        { email: { startsWith: token } },
                    ],
                },
            });
            await prisma.recipe.deleteMany({ where: { id: { in: recipeIds } } });
            await prisma.tag.deleteMany({ where: { id: { in: tagIds } } });
            recipeIds.length = 0;
            tagIds.length = 0;
        },
    };
}
