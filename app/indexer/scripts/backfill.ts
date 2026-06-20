import { Connection, PublicKey } from "@solana/web3.js";
import { producer } from "../src/kafka/client.js";
import { config } from "../src/config.js";

async function runBackfill() {
    const connection = new Connection(config.SOLANA_RPC_URL, "confirmed");
    const programId = new PublicKey(config.PROGRAM_ID);

    console.log("Fetching all accounts for program:", programId.toBase58());

    await producer.connect();

    const accounts = await connection.getProgramAccounts(programId);

    console.log(`Found ${accounts.length} accounts. Pushing to Kafka...`);

    for (const { pubkey, account } of accounts) {
        const payload = {
            pubkey: pubkey.toString('base64'),
            data: account.data.toString('base64'),
            owner: account.owner.toString('base64'),
            slot: 0 // Default for backfill
        };

        await producer.send({
            topic: 'lending_accounts',
            messages: [{ key: payload.pubkey, value: JSON.stringify(payload) }]
        });
    }

    console.log("✅ Backfill complete!");
    await producer.disconnect();
}

runBackfill();
