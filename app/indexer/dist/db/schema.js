"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.obligations = exports.reserves = exports.systemCursor = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.systemCursor = (0, pg_core_1.pgTable)("system_cursor", {
    id: (0, pg_core_1.varchar)("id", { length: 20 }).primaryKey().default("default"),
    last_processed_slot: (0, pg_core_1.bigint)("last_processed_slot", { mode: "number" }).notNull(),
    updated_at: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
exports.reserves = (0, pg_core_1.pgTable)("reserves", {
    pubkey: (0, pg_core_1.varchar)("pubkey", { length: 44 }).primaryKey(),
    liquidity_mint: (0, pg_core_1.varchar)("liquidity_mint", { length: 44 }).notNull(),
    total_liquidity: (0, pg_core_1.numeric)("total_liquidity", { precision: 38, scale: 0 }).notNull(),
    total_borrowed: (0, pg_core_1.numeric)("total_borrowed", { precision: 38, scale: 0 }).notNull(),
    cumulative_borrow_rate: (0, pg_core_1.numeric)("cumulative_borrow_rate", { precision: 38, scale: 0 }).notNull(), // u128 WAD Math
    loan_to_value_ratio: (0, pg_core_1.integer)("loan_to_value_ratio").notNull(),
    liquidation_threshold: (0, pg_core_1.integer)("liquidation_threshold").notNull(),
    current_price_usd: (0, pg_core_1.numeric)("current_price_usd", { precision: 18, scale: 6 }).notNull(),
    is_active: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    last_update_slot: (0, pg_core_1.bigint)("last_update_slot", { mode: "number" }).notNull(),
    updated_at: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
exports.obligations = (0, pg_core_1.pgTable)("obligations", {
    pubkey: (0, pg_core_1.varchar)("pubkey", { length: 44 }).primaryKey(),
    owner: (0, pg_core_1.varchar)("owner", { length: 44 }).notNull(),
    reserve: (0, pg_core_1.varchar)("reserve", { length: 44 }).notNull().references(() => exports.reserves.pubkey),
    deposited_amount: (0, pg_core_1.numeric)("deposited_amount", { precision: 38, scale: 0 }).notNull(),
    borrowed_amount_principal: (0, pg_core_1.numeric)("borrowed_amount_principal", { precision: 38, scale: 0 }).notNull(),
    calculated_debt: (0, pg_core_1.numeric)("calculated_debt", { precision: 38, scale: 0 }).notNull(),
    health_factor: (0, pg_core_1.numeric)("health_factor", { precision: 16, scale: 6 }).notNull(),
    is_liquidated: (0, pg_core_1.boolean)("is_liquidated").default(false).notNull(),
    last_update_slot: (0, pg_core_1.bigint)("last_update_slot", { mode: "number" }).notNull(),
    updated_at: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    ownerIdx: (0, pg_core_1.index)("obligation_owner_idx").on(table.owner),
    riskIdx: (0, pg_core_1.index)("obligation_risk_idx").on(table.health_factor, table.is_liquidated),
}));
//# sourceMappingURL=schema.js.map