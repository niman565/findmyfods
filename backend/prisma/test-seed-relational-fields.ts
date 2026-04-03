// NOTE: Make sure to run 'npx prisma migrate reset' before running this test
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import assert from "assert";

import { RECIPES } from "./constants/recipes";
import { seed } from "./seed";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const testSeedRelationalFields = async () => {
  await seed();
  const recipes = await prisma.recipe.findMany({
    where: {
      tags: {
        some: {
          tag: {
            name: "Vegetarian",
          },
        },
      },
    }
  });
  return recipes;
};

testSeedRelationalFields()
    .then((recipes) => {
        console.log("Test seed relational fields completed successfully");
        
        const actual_vegetarian_recipes = RECIPES.filter(recipe => recipe.tags.includes("Vegetarian"));
        try {
            assert.strictEqual(actual_vegetarian_recipes.length, recipes.length);
            console.log("Test passed");
        } catch (error) {
            console.log("Test failed");
            console.error(error);
        }
    })
    .catch(console.error);