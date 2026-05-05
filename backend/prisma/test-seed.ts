import assert from "assert";
import { RECIPES } from "./constants/recipes";
import { TAGS } from "./constants/tags";

// --- Types ---

interface Tag { id: number; name: string; category: string }
interface RecipeTagCreate { tagId: number }
interface RecipeCreate {
    title: string;
    tags: { create: RecipeTagCreate[] };
    [key: string]: unknown;
}

// --- Mock Prisma client ---

function buildMockPrisma(existingTags: Tag[] = []) {
    const tagStore: Tag[] = [...existingTags];
    let nextTagId = existingTags.length + 1;
    const recipeStore: RecipeCreate[] = [];
    const calls = { createMany: 0, findMany: 0, recipeCreate: 0 };

    return {
        calls,
        recipeStore,
        tagStore: () => tagStore,
        tag: {
            createMany: async ({ data, skipDuplicates }: { data: Tag[]; skipDuplicates?: boolean }) => {
                calls.createMany++;
                for (const tag of data) {
                    const exists = tagStore.some(t => t.name === tag.name);
                    if (exists && skipDuplicates) continue;
                    if (exists) throw new Error(`Unique constraint failed: name=${tag.name}`);
                    tagStore.push({ ...tag, id: nextTagId++ });
                }
            },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            findMany: async ({ select }: { select: { id: boolean; name: boolean } }) => {
                calls.findMany++;
                return tagStore.map(t => ({ id: t.id, name: t.name }));
            },
        },
        recipe: {
            create: async ({ data }: { data: RecipeCreate }) => {
                calls.recipeCreate++;
                recipeStore.push(data);
                return data;
            },
        },
    };
}

// --- Seed logic (mirrors seed.ts, injected with mock) ---

async function runSeed(prisma: ReturnType<typeof buildMockPrisma>) {
    await prisma.tag.createMany({ data: TAGS as Tag[], skipDuplicates: true });
    const tags = await prisma.tag.findMany({ select: { id: true, name: true } });
    await Promise.all(
        RECIPES.map(recipe =>
            prisma.recipe.create({
                data: {
                    ...recipe,
                    tags: {
                        create: (recipe.tags || []).map(tagName => ({
                            tagId: tags.find(t => t.name === tagName)!.id,
                        })),
                    },
                },
            })
        )
    );
}

// --- Tests ---

async function test(name: string, fn: () => Promise<void>) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${(err as Error).message}`);
        process.exitCode = 1;
    }
}

async function main() {
    console.log("seed tests\n");

    await test("inserts all unique tags from TAGS", async () => {
        const prisma = buildMockPrisma();
        await runSeed(prisma);
        const uniqueNames = [...new Set(TAGS.map(t => t.name))];
        assert.strictEqual(prisma.tagStore().length, uniqueNames.length);
    });

    await test("creates all recipes", async () => {
        const prisma = buildMockPrisma();
        await runSeed(prisma);
        assert.strictEqual(prisma.recipeStore.length, RECIPES.length);
    });

    await test("each recipe's tag IDs resolve to valid tag IDs", async () => {
        const prisma = buildMockPrisma();
        await runSeed(prisma);
        const validIds = new Set(prisma.tagStore().map(t => t.id));
        for (const recipe of prisma.recipeStore) {
            for (const { tagId } of recipe.tags.create) {
                assert.ok(validIds.has(tagId), `tagId ${tagId} not found in tag store`);
            }
        }
    });

    await test("recipes have the correct number of tags", async () => {
        const prisma = buildMockPrisma();
        await runSeed(prisma);
        for (let i = 0; i < RECIPES.length; i++) {
            const expected = (RECIPES[i].tags || []).length;
            const actual = prisma.recipeStore[i].tags.create.length;
            assert.strictEqual(actual, expected, `recipe "${RECIPES[i].title}": expected ${expected} tags, got ${actual}`);
        }
    });

    await test("skipDuplicates: does not re-insert existing tags", async () => {
        const existing: Tag[] = TAGS.slice(0, 3).map((t, i) => ({ ...t, id: i + 1 }));
        const prisma = buildMockPrisma(existing);
        await runSeed(prisma);
        const uniqueNames = [...new Set(TAGS.map(t => t.name))];
        assert.strictEqual(prisma.tagStore().length, uniqueNames.length);
    });

    await test("seed is idempotent: running twice does not duplicate tags", async () => {
        const prisma = buildMockPrisma();
        await runSeed(prisma);
        const countAfterFirst = prisma.tagStore().length;
        await runSeed(prisma);
        assert.strictEqual(prisma.tagStore().length, countAfterFirst);
    });

    await test("calls createMany and findMany exactly once per run", async () => {
        const prisma = buildMockPrisma();
        await runSeed(prisma);
        assert.strictEqual(prisma.calls.createMany, 1);
        assert.strictEqual(prisma.calls.findMany, 1);
    });

    console.log();
}

main();
