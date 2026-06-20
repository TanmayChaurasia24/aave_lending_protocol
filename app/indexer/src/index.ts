import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { dbQueries } from "./db/queries.js";
import { startGrpcStream } from "./grpc.js";
import { producer, consumer } from "./kafka/client.js";
import { startKafkaConsumer } from "./kafka/consumer.js";

const fastify = Fastify({ logger: true });
fastify.register(cors, {
    origin: "*",
});

fastify.get("/api/liquidation", async (request, reply) => {
    try {
        const opportunities = await dbQueries.getLiquidatablePositions(20);
        return { success: true, data: opportunities };
    } catch (error) {
        console.error("Error fetching liquidation opportunities:", error);
        return { success: false, message: "Failed to fetch liquidation opportunities" };

    }
})

const startServer = async () => {
    try {
        await fastify.listen({ port: config.PORT, host: "0.0.0.0" });
        console.log(`Server is running on http://localhost:${config.PORT}`);

        console.log("connecting to kafka...");
        await producer.connect();
        await startKafkaConsumer();
        console.log("kafka pipeline is ready.");

        startGrpcStream().catch(err => {
            console.error("Failed to start gRPC stream:", err);
        });

    } catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
}

async function shutdown() {
    console.log("shutting down...");
    await consumer.disconnect();
    await producer.disconnect();
    console.log("gracefull shutdown complete.");
    process.exit(0);
}

startServer();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);