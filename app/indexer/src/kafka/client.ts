import { Kafka } from "kafkajs";

export const kafka = new Kafka({
    clientId: 'solana-lending-indexer',
    brokers: ['localhost:9092']
});

export const producer = kafka.producer();

export const consumer = kafka.consumer({ groupId: 'indexer-grp-1' });