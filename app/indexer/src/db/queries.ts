import { eq, and, lt } from "drizzle-orm";
import { db } from "./client.js";
import { userPositions, reserves, lendingPools, indexerCursor } from "./schema.js";

export const dbQueries = {
  async getUserPosition(pubkey: string) {
    return db.select().from(userPositions).where(eq(userPositions.pubkey, pubkey)).limit(1);
  },

  async updateUserPosition(pubkey: string, updates: Partial<typeof userPositions.$inferInsert>) {
    return db.update(userPositions).set(updates).where(eq(userPositions.pubkey, pubkey));
  },

  async upsertUserPosition(position: typeof userPositions.$inferInsert) {
    return db.insert(userPositions).values(position).onConflictDoUpdate({
        target: userPositions.pubkey,
        set: position
    });
  },

  async upsertReserve(reserve: typeof reserves.$inferInsert) {
    return db.insert(reserves).values(reserve).onConflictDoUpdate({
        target: reserves.pubkey,
        set: reserve
    });
  },

  async upsertProtocol(protocol: typeof lendingPools.$inferInsert) {
    return db.insert(lendingPools).values(protocol).onConflictDoUpdate({
        target: lendingPools.pubkey,
        set: protocol
    });
  },

  async getLiquidatablePositions(limit = 50) {
    return db
      .select()
      .from(userPositions)
      .where(
        and(
          lt(userPositions.health_factor, "1.0"),
          eq(userPositions.at_risk, true)
        )
      )
      .orderBy(userPositions.health_factor)
      .limit(limit);
  },

  async upsertCursor(slot: number) {
    return db.insert(indexerCursor).values({
        key: "latest_slot",
        slot: slot.toString(),
        updated_at: new Date()
    }).onConflictDoUpdate({
        target: indexerCursor.key,
        set: { slot: slot.toString(), updated_at: new Date() }
    });
  }
};