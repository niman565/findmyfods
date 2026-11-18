import { z } from "zod";

import { IdSchema } from "./Id";

export const RecipeSpecificSchema = z.object({
    id: IdSchema
});

export const RecipeGeneralSchema = z.object({
    id: IdSchema
});
