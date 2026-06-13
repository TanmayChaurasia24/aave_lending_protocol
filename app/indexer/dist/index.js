"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const config_1 = require("./config");
const queries_1 = require("./db/queries");
const fastify = (0, fastify_1.default)({ logger: true });
fastify.register(cors_1.default, {
    origin: "*",
});
fastify.get("/api/liquidation", async (request, reply) => {
    try {
        const opportunities = await queries_1.dbQueries.getLiquidatablePositions(20);
        return { success: true, data: opportunities };
    }
    catch (error) {
        console.error("Error fetching liquidation opportunities:", error);
        return { success: false, message: "Failed to fetch liquidation opportunities" };
    }
});
const startServer = async () => {
    try {
        await fastify.listen({ port: config_1.config.PORT, host: "0.0.0.0" });
        console.log(`Server is running on http://localhost:${config_1.config.PORT}`);
    }
    catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=index.js.map