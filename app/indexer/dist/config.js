"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const configSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["developement", "production", "testing"]).default("developement"),
    PORT: zod_1.z.number().default(3000),
    DATABASE_URL: zod_1.z.string().url(),
    DIRECT_URL: zod_1.z.string().url(),
    DB_MAX_CONNECTIONS: zod_1.z.number().default(10),
    YELLOWSTONE_RPC_URL: zod_1.z.string().url(),
    YELLOWSTONE_TOKEN: zod_1.z.string(),
    SOLANA_RPC_URL: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().url(),
    PROGRAM_ID: zod_1.z.string().min(32).max(44)
});
exports.config = configSchema.parse(process.env);
//# sourceMappingURL=config.js.map