import { 
    pgTable, 
    varchar, 
    bigint, 
    numeric, 
    boolean, 
    timestamp, 
    integer, 
    index, 
    text, 
    smallint 
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 1. lending_pools
export const lendingPools = pgTable("lending_pools", {
    pubkey: varchar("pubkey", { length: 44 }).primaryKey(),
    authority: varchar("authority", { length: 44 }).notNull(),
    paused: boolean("paused").notNull(),
    total_reserves: integer("total_reserves").notNull(),
    last_slot: bigint("last_slot", { mode: "number" }).notNull(),
    last_updated: timestamp("last_updated", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. reserves
export const reserves = pgTable("reserves", {
    pubkey: varchar("pubkey", { length: 44 }).primaryKey(),
    token_mint: varchar("token_mint", { length: 44 }).notNull(),
    vault: varchar("vault", { length: 44 }).notNull(),
    total_deposits: numeric("total_deposits", { precision: 28, scale: 0 }).notNull(),
    total_borrows: numeric("total_borrows", { precision: 28, scale: 0 }).notNull(),
    utilisation_rate: numeric("utilisation_rate", { precision: 10, scale: 8 }).notNull(),
    borrow_rate_bps: integer("borrow_rate_bps").notNull(),
    cumulative_index: numeric("cumulative_index", { precision: 40, scale: 0 }).notNull(),
    ltv_ratio: integer("ltv_ratio").notNull(),
    liquidation_threshold: integer("liquidation_threshold").notNull(),
    liquidation_bonus: integer("liquidation_bonus").notNull(),
    oracle: varchar("oracle", { length: 44 }).notNull(),
    last_slot: bigint("last_slot", { mode: "number" }).notNull(),
    last_updated: timestamp("last_updated", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    tokenMintIdx: index("reserve_token_mint_idx").on(table.token_mint),
}));

// 3. user_positions
export const userPositions = pgTable("user_positions", {
    pubkey: varchar("pubkey", { length: 44 }).primaryKey(),
    owner: varchar("owner", { length: 44 }).notNull(),
    reserve: varchar("reserve", { length: 44 }).notNull().references(() => reserves.pubkey),
    token_mint: varchar("token_mint", { length: 44 }).notNull(),
    deposited_amount: numeric("deposited_amount", { precision: 28, scale: 0 }).notNull(),
    borrowed_amount: numeric("borrowed_amount", { precision: 28, scale: 0 }).notNull(),
    borrow_index_at_open: numeric("borrow_index_at_open", { precision: 40, scale: 0 }).notNull(),
    health_factor: numeric("health_factor", { precision: 20, scale: 8 }),
    at_risk: boolean("at_risk").notNull(),
    collateral_value_usd: numeric("collateral_value_usd", { precision: 20, scale: 8 }).notNull(),
    debt_value_usd: numeric("debt_value_usd", { precision: 20, scale: 8 }).notNull(),
    last_slot: bigint("last_slot", { mode: "number" }).notNull(),
    last_updated: timestamp("last_updated", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    ownerIdx: index("user_position_owner_idx").on(table.owner),
    atRiskIdx: index("user_position_at_risk_idx").on(table.at_risk).where(sql`${table.at_risk} = TRUE`),
    healthFactorIdx: index("user_position_health_factor_idx").on(table.health_factor).where(sql`${table.health_factor} IS NOT NULL`),
    reserveIdx: index("user_position_reserve_idx").on(table.reserve),
}));

// 4. liquidation_events
export const liquidationEvents = pgTable("liquidation_events", {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    tx_signature: varchar("tx_signature", { length: 88 }).unique().notNull(),
    slot: bigint("slot", { mode: "number" }).notNull(),
    borrower: varchar("borrower", { length: 44 }).notNull(),
    liquidator: varchar("liquidator", { length: 44 }).notNull(),
    collateral_mint: varchar("collateral_mint", { length: 44 }).notNull(),
    debt_mint: varchar("debt_mint", { length: 44 }).notNull(),
    collateral_seized: numeric("collateral_seized", { precision: 28, scale: 0 }).notNull(),
    debt_repaid: numeric("debt_repaid", { precision: 28, scale: 0 }).notNull(),
    collateral_seized_usd: numeric("collateral_seized_usd", { precision: 20, scale: 8 }).notNull(),
    debt_repaid_usd: numeric("debt_repaid_usd", { precision: 20, scale: 8 }).notNull(),
    liquidator_profit_usd: numeric("liquidator_profit_usd", { precision: 20, scale: 8 }).notNull(),
    health_factor_at_liquidation: numeric("health_factor_at_liquidation", { precision: 20, scale: 8 }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
}, (table) => ({
    borrowerIdx: index("liquidation_borrower_idx").on(table.borrower),
    liquidatorIdx: index("liquidation_liquidator_idx").on(table.liquidator),
    timestampIdx: index("liquidation_timestamp_idx").on(table.timestamp),
}));

// 5. oracle_prices
export const oraclePrices = pgTable("oracle_prices", {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    token_mint: varchar("token_mint", { length: 44 }).notNull(),
    price_usd: numeric("price_usd", { precision: 20, scale: 8 }).notNull(),
    confidence: numeric("confidence", { precision: 20, scale: 8 }).notNull(),
    exponent: smallint("exponent").notNull(),
    oracle_pubkey: varchar("oracle_pubkey", { length: 44 }).notNull(),
    slot: bigint("slot", { mode: "number" }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
}, (table) => ({
    tokenMintSlotIdx: index("oracle_prices_token_mint_slot_idx").on(table.token_mint, sql`${table.slot} DESC`),
}));

// 6. interest_accrual_events
export const interestAccrualEvents = pgTable("interest_accrual_events", {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    tx_signature: varchar("tx_signature", { length: 88 }).unique().notNull(),
    reserve_pubkey: varchar("reserve_pubkey", { length: 44 }).notNull(),
    token_mint: varchar("token_mint", { length: 44 }).notNull(),
    slot: bigint("slot", { mode: "number" }).notNull(),
    elapsed_seconds: integer("elapsed_seconds").notNull(),
    old_cumulative_index: numeric("old_cumulative_index", { precision: 40, scale: 0 }).notNull(),
    new_cumulative_index: numeric("new_cumulative_index", { precision: 40, scale: 0 }).notNull(),
    borrow_rate_bps: integer("borrow_rate_bps").notNull(),
    utilisation_rate: numeric("utilisation_rate", { precision: 10, scale: 8 }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
}, (table) => ({
    reserveSlotIdx: index("interest_accrual_reserve_slot_idx").on(table.reserve_pubkey, sql`${table.slot} DESC`),
}));

// 7. indexer_cursor
export const indexerCursor = pgTable("indexer_cursor", {
    key: text("key").primaryKey(),
    slot: text("slot").notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// 8. indexer_lock
export const indexerLock = pgTable("indexer_lock", {
    key: text("key").primaryKey(),
    holder: text("holder").notNull(),
    pid: integer("pid").notNull(),
    acquired_at: timestamp("acquired_at", { withTimezone: true }).notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
});