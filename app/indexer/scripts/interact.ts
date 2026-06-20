import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import BN from "bn.js";
import { Keypair, Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { createMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";
import idl from "../../../target/idl/sol_lending.json" assert { type: "json" };
import { config } from "../src/config.js";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function main() {
    console.log("\n========================================================");
    console.log("🔥  SOLANA LENDING PROTOCOL: LOAD TESTING SUITE v1.0  🔥");
    console.log("========================================================\n");

    console.log("⚡ [SYS] Initializing RPC Connection to Testnet...");
    const connection = new Connection(config.SOLANA_RPC_URL, "confirmed");

    const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || "";
    if (!PRIVATE_KEY) throw new Error("Missing TEST_PRIVATE_KEY");
    const wallet = new anchor.Wallet(Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY)));

    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    anchor.setProvider(provider);

    const programId = new PublicKey(config.PROGRAM_ID);
    const program = new Program(idl as any, provider);

    console.log(`🔐 [AUTH] Loaded Admin Wallet: ${wallet.publicKey.toBase58()}`);
    console.log(`📦 [SYS] Targeting Program ID:  ${programId.toBase58()}\n`);

    const MARKETS_TO_SEED = 3;
    console.log(`🚀 [TEST] Initiating mass seeding of ${MARKETS_TO_SEED} Lending Reserves...\n`);

    const [protocolAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("protocol")],
        programId
    );

    for (let i = 1; i <= MARKETS_TO_SEED; i++) {
        console.log(`--------------------------------------------------------`);
        console.log(`⏳ [MARKET ${i}/${MARKETS_TO_SEED}] Generating liquidity pool...`);
        
        try {
            // 1. Create a mock SPL Token Mint
            const mint = await createMint(connection, wallet.payer, wallet.publicKey, null, 6);
            console.log(`   🪙 [TOKEN] Mint Address Generated: ${mint.toBase58()}`);

            // 2. Derive PDAs
            const [reserveAddress] = PublicKey.findProgramAddressSync([Buffer.from("reserve"), mint.toBuffer()], programId);
            const [liquidityVault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), reserveAddress.toBuffer()], programId);
            const [collateralMint] = PublicKey.findProgramAddressSync([Buffer.from("collateral"), reserveAddress.toBuffer()], programId);

            console.log(`   🏗️ [CONTRACT] Dispatching createReserve payload to cluster...`);
            
            // 3. Send Transaction
            const tx = await program.methods
                .createReserve(
                    new BN(80), // loan_to_value_ratio
                    new BN(85), // liquidation_threshold
                    new BN(5)   // liquidation_bonus
                )
                .accounts({
                    authority: wallet.publicKey,
                    protocol: protocolAddress,
                    reserve: reserveAddress,
                    liquidityMint: mint,
                    liquidityVault: liquidityVault,
                    collateralMint: collateralMint,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log(`   ✅ [SUCCESS] Reserve ${i} securely deployed to blockchain!`);
            console.log(`   🔗 [TX] https://explorer.solana.com/tx/${tx}?cluster=testnet`);
            
            console.log(`   📡 [KAFKA] Expecting event intercept in indexer...`);
            await delay(2000); // Breathe between blocks
        } catch (error: any) {
            console.error(`   ❌ [ERROR] Deployment failed for Market ${i}:`, error.message);
        }
    }

    console.log(`\n========================================================`);
    console.log(`🎉 [DONE] LOAD TEST COMPLETE. CHECK INDEXER DASHBOARD! `);
    console.log(`========================================================\n`);
}

main();
