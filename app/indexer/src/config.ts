import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "testing"]).default("development"),
    PORT: z.coerce.number().default(3000),

    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    DB_MAX_CONNECTIONS: z.coerce.number().default(10),

    YELLOWSTONE_GRPC_URL: z.string().url(),
    YELLOWSTONE_TOKEN: z.string().optional(),
    SOLANA_RPC_URL: z.string().url(),
    REDIS_URL: z.string().url().optional(),

    PROGRAM_ID: z.string().min(32).max(44)
})

export const config = configSchema.parse(process.env);