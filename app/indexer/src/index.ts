import Fastify from "fastify";
import cors from "@fastify/cors";
import {config} from "./config";
import {dbQueries} from "./db/queries";

const fastify = Fastify({logger: true});
fastify.register(cors, {
    origin: "*",
});

fastify.get("/api/liquidation", async (request, reply) => {
    try {
        const opportunities = await dbQueries.getLiquidatablePositions(20);
        return {success: true, data: opportunities};
    } catch (error) {
        console.error("Error fetching liquidation opportunities:", error);
        return {success: false, message: "Failed to fetch liquidation opportunities"};

    }
})

const startServer = async () => {
    try {
        await fastify.listen({port: config.PORT, host: "0.0.0.0"});
        console.log(`Server is running on http://localhost:${config.PORT}`);
    } catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
}

startServer();