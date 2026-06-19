import yellowstone, { SubscribeRequest } from "@triton-one/yellowstone-grpc";
import { config } from "./config.js";

const Client = yellowstone.default;

const client = new Client(config.YELLOWSTONE_GRPC_URL, config.YELLOWSTONE_TOKEN || undefined, undefined, {
    backoff: {
        initialIntervalMs: 100,
        multiplier: 2,
        maxRetries: 10,
    },
    slotRetention: 250,
});

// connect to the client
await client.connect();
console.log("Connected to Yellowstone gRPC");

const stream = await client.subscribe();

stream.on("data", (data) => {
    // This will trigger when the blockchain sends an update
    if (data.account) {
        console.log("Account update received!", data.account);
    }
});

// Tell Yellowstone what data you want to stream!
const request: SubscribeRequest = {
    slots: {},
    accounts: {
        programAccounts: {
            account: [],
            filter: [],
            // Subscribe to all accounts owned by your lending program!
            owner: [config.PROGRAM_ID],
        }
    },
    transactions: {},
    blocks: {},
    blocksMeta: {},
    entry: {},
    commitment: 1, // 1 = Confirmed, 2 = Finalized
    accountsDataSlice: [],
};

// Send the subscription request to the stream
await new Promise<void>((resolve, reject) => {
    stream.write(request, (err: any) => {
        if (err === null || err === undefined) resolve();
        else reject(err);
    });
});
console.log("Subscribed to program:", config.PROGRAM_ID);