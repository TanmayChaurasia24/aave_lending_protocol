import yellowstone, { SubscribeRequest } from "@triton-one/yellowstone-grpc";
import { config } from "./config.js";
import { producer } from "./kafka/client.js";

const Client = yellowstone.default;

const client = new Client(config.YELLOWSTONE_GRPC_URL, config.YELLOWSTONE_TOKEN || undefined, undefined, {
    backoff: {
        initialIntervalMs: 100,
        multiplier: 2,
        maxRetries: 10,
    },
    slotRetention: 250,
});

export async function startGrpcStream() {
    await client.connect();
    console.log("Connected to Yellowstone gRPC");

    const stream = await client.subscribe();

    stream.on("data", async (data) => {
        if (data.account) {
            console.log("Account update received!", data.account.account.pubkey);

            const payload = {
                pubkey: data.account.account.pubkey.toString('base64'),
                data: data.account.account.data.toString('base64'),
                owner: data.account.account.owner.toString('base64'),
                slot: data.slot
            }

            await producer.send({
                topic: 'lending_accounts',
                messages: [
                    {
                        key: payload.pubkey,
                        value: JSON.stringify(payload)
                    }
                ]
            })
        }
    });

    const request: SubscribeRequest = {
        slots: {},
        accounts: {
            programAccounts: {
                account: [],
                filters: [],
                owner: [config.PROGRAM_ID],
            }
        },
        transactions: {},
        transactionsStatus: {},
        blocks: {},
        blocksMeta: {},
        entry: {},
        commitment: 1,
        accountsDataSlice: [],
    };

    await new Promise<void>((resolve, reject) => {
        stream.write(request, (err: any) => {
            if (err === null || err === undefined) resolve();
            else reject(err);
        });
    });
    console.log("Subscribed to program:", config.PROGRAM_ID);
}