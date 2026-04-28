import { z } from "zod";

export const RecipeSpecificSchema = z.object({
    id: z.coerce.number()
});

export const RecipeGeneralSchema = z.object({
    id: z.coerce.number()
});
