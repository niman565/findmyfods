import { z } from "zod";

// Largest value a Postgres INTEGER column can hold. Anything bigger can never
// be a real id, and would make the database query fail.
const MAX_ID = 2147483647;

// An id taken from the URL: a whole number from 1 up to MAX_ID.
export const IdSchema = z.coerce.number().int().positive().max(MAX_ID);
