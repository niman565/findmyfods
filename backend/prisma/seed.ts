import { PrismaPg } from "@prisma/adapter-pg";

import { RECIPES } from "./constants/recipes";
import { TAGS } from "./constants/tags";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

export const seed = async () => {
    await prisma.tag.createMany({
        data: TAGS,
        skipDuplicates: true,
    });
    const tags = await prisma.tag.findMany({ select: { id: true, name: true } });
    await Promise.all(RECIPES.map(recipe =>
        prisma.recipe.create({
          data: {
            ...recipe,
            tags: {
              create: (recipe.tags || []).map(tagName => ({
                tagId: tags.find(t => t.name === tagName)!.id
              }))
            }
          }
        })
      ));
};

if (require.main === module) {
  seed()
    .then(() => console.log("Seed completed successfully"))
    .catch(console.error);
}
