import { z } from "zod";

export const UserRegisterSchema = z.object({
    username: z.string().min(1),
    email: z.email(),
    password: z.string().min(8),
});

export const UserLoginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(8)
});
