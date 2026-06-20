import { BorshCoder } from "@coral-xyz/anchor";
import idl from "../../../target/idl/sol_lending.json" with { type: "json" };
import { dbQueries } from "./db/queries.js";
import bs58 from "bs58";
import axios from "axios";

// Price Cache to avoid spamming Pyth API
let solPriceCache = { price: 0, lastUpdated: 0 };
const PYTH_SOL_USD_FEED = "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

async function getLiveSolPrice(): Promise<number> {
    const now = Date.now();
    // Use cached price if less than 5 seconds old
    if (now - solPriceCache.lastUpdated < 5000 && solPriceCache.price > 0) {
        return solPriceCache.price;
    }

    try {
        const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${PYTH_SOL_USD_FEED}`;
        const response = await axios.get(url);
        const priceData = response.data.parsed[0].price;
        const price = Number(priceData.price) * (10 ** priceData.expo);
        solPriceCache = { price, lastUpdated: now };
        return price;
    } catch (e) {
        console.error("Failed to fetch Pyth price, using cache", e);
        return solPriceCache.price || 150.00; // Fallback so it doesn't crash
    }
}

const coder: any = new BorshCoder(idl as any);

const DISCRIMINATORS = {
    Protocol: coder.accounts.accountDiscriminator("Protocol").toString("hex"),
    Reserve: coder.accounts.accountDiscriminator("Reserve").toString("hex"),
    Obligation: coder.accounts.accountDiscriminator("Obligation").toString("hex"),
};

export async function ProcessAccount(data: any) {
    try {
        const accountInfo = data.account.account;
        const pubkey = bs58.encode(Buffer.from(accountInfo.pubkey));
        const buffer = Buffer.from(accountInfo.data);
        const discriminator = buffer.subarray(0, 8).toString("hex");

        switch (discriminator) {
            case DISCRIMINATORS.Protocol: {
                const decoded = coder.accounts.decode("Protocol", buffer);
                console.log("\n🏦 --- NEW PROTOCOL UPDATE ---");
                console.log(`🔑 Pubkey:    ${pubkey}`);
                console.log(`👑 Authority: ${decoded.admin ? decoded.admin.toBase58() : "None"}`);
                console.log(`📊 Decoded Data:`, JSON.stringify(decoded, (key, value) => 
                    typeof value === 'bigint' ? value.toString() : value, 2));
                console.log(`💾 Saving to database...`);

                await dbQueries.upsertProtocol({
                    pubkey,
                    authority: decoded.admin ? decoded.admin.toBase58() : "",
                    paused: decoded.is_paused || false,
                    total_reserves: decoded.reserve_count ? decoded.reserve_count.toNumber() : 0,
                    last_slot: Number(data.slot || 0),
                    last_updated: new Date()
                });
                console.log(`✅ Protocol saved successfully!`);
                break;
            }
            case DISCRIMINATORS.Reserve: {
                const decoded = coder.accounts.decode("Reserve", buffer);
                console.log("\n💰 --- NEW RESERVE UPDATE ---");
                console.log(`🔑 Pubkey:    ${pubkey}`);
                console.log(`🪙 Mint:      ${decoded.liquidity_mint ? decoded.liquidity_mint.toBase58() : "None"}`);
                console.log(`🏦 Vault:     ${decoded.liquidity_vault ? decoded.liquidity_vault.toBase58() : "None"}`);
                console.log(`📊 Decoded Data:`, JSON.stringify(decoded, (key, value) => 
                    typeof value === 'bigint' ? value.toString() : value, 2));
                console.log(`💾 Saving to database...`);

                // Calculate Utilisation Rate
                const totalLiquidity = decoded.total_liquidity ? Number(decoded.total_liquidity.toString()) : 0;
                const totalBorrowed = decoded.total_borrowed ? Number(decoded.total_borrowed.toString()) : 0;
                const utilisationRate = totalLiquidity > 0 ? (totalBorrowed / (totalLiquidity + totalBorrowed)) * 100 : 0;

                await dbQueries.upsertReserve({
                    pubkey,
                    token_mint: decoded.liquidity_mint ? decoded.liquidity_mint.toBase58() : "",
                    vault: decoded.liquidity_vault ? decoded.liquidity_vault.toBase58() : "",
                    total_deposits: decoded.total_liquidity ? decoded.total_liquidity.toString() : "0",
                    total_borrows: decoded.total_borrowed ? decoded.total_borrowed.toString() : "0",
                    utilisation_rate: utilisationRate.toFixed(2),
                    borrow_rate_bps: 0, // This would require dynamic calculation based on utilisation
                    cumulative_index: decoded.cumulative_borrow_rate_wads ? decoded.cumulative_borrow_rate_wads.toString() : "0",
                    ltv_ratio: decoded.loan_to_value_ratio ? decoded.loan_to_value_ratio.toNumber() : 0,
                    liquidation_threshold: decoded.liquidation_threshold ? decoded.liquidation_threshold.toNumber() : 0,
                    liquidation_bonus: decoded.liquidation_bonus ? decoded.liquidation_bonus.toNumber() : 0,
                    oracle: decoded.oracle ? decoded.oracle.toBase58() : "",
                    last_slot: Number(data.slot || 0),
                    last_updated: new Date()
                });
                console.log(`✅ Reserve saved successfully!`);
                break;
            }
            case DISCRIMINATORS.Obligation: {
                const decoded = coder.accounts.decode("Obligation", buffer);
                console.log("\n👤 --- NEW USER POSITION (OBLIGATION) ---");
                console.log(`🔑 Position Pubkey: ${pubkey}`);
                console.log(`🧑 User Wallet:     ${decoded.owner ? decoded.owner.toBase58() : "None"}`);
                console.log(`🏦 Reserve:         ${decoded.reserve ? decoded.reserve.toBase58() : "None"}`);
                console.log(`📊 Decoded Data:`, JSON.stringify(decoded, (key, value) => 
                    typeof value === 'bigint' ? value.toString() : value, 2));
                console.log(`💾 Saving to database...`);

                // 🔴 ORACLE INTEGRATION 🔴
                const solPrice = await getLiveSolPrice();
                const depositedAmount = decoded.deposited_amount ? Number(decoded.deposited_amount.toString()) : 0;
                const borrowedAmount = decoded.borrowed_amount ? Number(decoded.borrowed_amount.toString()) : 0;
                
                // Assuming SOL has 9 decimals
                const collateralUsd = (depositedAmount / 1e9) * solPrice;
                // Assuming borrowed token is USDC with 6 decimals (and is $1 peg)
                const debtUsd = (borrowedAmount / 1e6) * 1.0; 

                // Calculate Health Factor
                // Health Factor = (Collateral USD * Liquidation Threshold) / Debt USD
                // Assume threshold is 0.80 for this example (80%)
                const liquidationThreshold = 0.80;
                let healthFactor = 100.0; // Safely high if no debt
                if (debtUsd > 0) {
                    healthFactor = (collateralUsd * liquidationThreshold) / debtUsd;
                }

                await dbQueries.upsertUserPosition({
                    pubkey,
                    owner: decoded.owner ? decoded.owner.toBase58() : "",
                    reserve: decoded.reserve ? decoded.reserve.toBase58() : "",
                    token_mint: "", // Not directly on obligation, could be fetched from related reserve if needed
                    deposited_amount: decoded.deposited_amount ? decoded.deposited_amount.toString() : "0",
                    borrowed_amount: decoded.borrowed_amount ? decoded.borrowed_amount.toString() : "0",
                    borrow_index_at_open: decoded.borrow_index_snapshot ? decoded.borrow_index_snapshot.toString() : "0",
                    health_factor: healthFactor.toFixed(4), 
                    at_risk: healthFactor < 1.0, // Mark at risk if HF < 1.0
                    collateral_value_usd: collateralUsd.toFixed(2), 
                    debt_value_usd: debtUsd.toFixed(2), 
                    last_slot: Number(data.slot || 0),
                    last_updated: new Date()
                });
                console.log(`✅ User Position saved successfully!`);
                break;
            }
            default:
                break;
        }

        if (data.slot) {
            await dbQueries.upsertCursor(Number(data.slot));
        }

    } catch (error) {
        console.error("Error processing account:", error);
    }
}