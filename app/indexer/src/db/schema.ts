import { pgTable, varchar, bigint, numeric, boolean, timestamp, integer, index } from "drizzle-orm/pg-core";

export const systemCursor = pgTable("system_cursor", {
    id: varchar("id", { length: 20 }).primaryKey().default("default"),
    last_processed_slot: bigint("last_processed_slot", { mode: "number" }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reserves = pgTable("reserves", {
    pubkey: varchar("pubkey", { length: 44 }).primaryKey(),
    liquidity_mint: varchar("liquidity_mint", { length: 44 }).notNull(),
    total_liquidity: numeric("total_liquidity", { precision: 38, scale: 0 }).notNull(),
    total_borrowed: numeric("total_borrowed", { precision: 38, scale: 0 }).notNull(),
    cumulative_borrow_rate: numeric("cumulative_borrow_rate", { precision: 38, scale: 0 }).notNull(), // u128 WAD Math
    loan_to_value_ratio: integer("loan_to_value_ratio").notNull(),
    liquidation_threshold: integer("liquidation_threshold").notNull(),
    current_price_usd: numeric("current_price_usd", { precision: 18, scale: 6 }).notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    last_update_slot: bigint("last_update_slot", { mode: "number" }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const obligations = pgTable("obligations", {
    pubkey: varchar("pubkey", { length: 44 }).primaryKey(),
    owner: varchar("owner", { length: 44 }).notNull(),
    reserve: varchar("reserve", { length: 44 }).notNull().references(() => reserves.pubkey),
    deposited_amount: numeric("deposited_amount", { precision: 38, scale: 0 }).notNull(),
    borrowed_amount_principal: numeric("borrowed_amount_principal", { precision: 38, scale: 0 }).notNull(),
    calculated_debt: numeric("calculated_debt", { precision: 38, scale: 0 }).notNull(),
    health_factor: numeric("health_factor", { precision: 16, scale: 6 }).notNull(),
    is_liquidated: boolean("is_liquidated").default(false).notNull(),
    last_update_slot: bigint("last_update_slot", { mode: "number" }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    ownerIdx: index("obligation_owner_idx").on(table.owner),
    riskIdx: index("obligation_risk_idx").on(table.health_factor, table.is_liquidated),
}));