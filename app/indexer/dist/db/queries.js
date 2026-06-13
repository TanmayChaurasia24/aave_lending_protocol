"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbQueries = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("./client");
const schema_1 = require("./schema");
exports.dbQueries = {
    async getObligation(pubkey) {
        return client_1.db.select().from(schema_1.obligations).where((0, drizzle_orm_1.eq)(schema_1.obligations.pubkey, pubkey)).limit(1);
    },
    async updateObligationMetrics(pubkey, updates) {
        return client_1.db.update(schema_1.obligations).set(updates).where((0, drizzle_orm_1.eq)(schema_1.obligations.pubkey, pubkey));
    },
    async getLiquidatablePositions(limit = 50) {
        return client_1.db
            .select()
            .from(schema_1.obligations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.lt)(schema_1.obligations.health_factor, "1.0"), (0, drizzle_orm_1.eq)(schema_1.obligations.is_liquidated, false)))
            .orderBy(schema_1.obligations.health_factor)
            .limit(limit);
    }
};
//# sourceMappingURL=queries.js.map