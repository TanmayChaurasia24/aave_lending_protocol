import { consumer, producer } from './client.js';
import { ProcessAccount } from '../processor.js';

export async function startKafkaConsumer() {
    await consumer.connect();
    await consumer.subscribe({ topic: 'lending_accounts', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) return;

            try {
                const payload = JSON.parse(message.value.toString());

                const reconstructedData = {
                    slot: payload.slot,
                    account: {
                        account: {
                            pubkey: Buffer.from(payload.pubkey, 'base64'),
                            data: Buffer.from(payload.data, 'base64'),
                            owner: Buffer.from(payload.owner, 'base64'),
                        }
                    }
                };

                await ProcessAccount(reconstructedData);
            } catch (error: any) {
                console.error("error parsing message or processing", error.message);
                await producer.send({
                    topic: 'lending_accounts_dlq',
                    messages: [{
                        key: message.key,
                        value: message.value?.toString(),
                        headers: {
                            error: String(error)
                        }
                    }
                    ],
                });
            }
        },
    });
}
