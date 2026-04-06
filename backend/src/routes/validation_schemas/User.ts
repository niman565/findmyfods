import { z } from "zod";

export const UserSchema = z.object({
    username: z.string().min(1),
    email: z.email(),
    password: z.string().min(8),
});