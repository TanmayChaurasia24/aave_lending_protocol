import { eq, and, lt } from "drizzle-orm";
import { db } from "./client";
import { obligations } from "./schema";

export const dbQueries = {
  async getObligation(pubkey: string) {
    return db.select().from(obligations).where(eq(obligations.pubkey, pubkey)).limit(1);
  },

  async updateObligationMetrics(pubkey: string, updates: Partial<typeof obligations.$inferInsert>) {
    return db.update(obligations).set(updates).where(eq(obligations.pubkey, pubkey));
  },

  async getLiquidatablePositions(limit = 50) {
    return db
      .select()
      .from(obligations)
      .where(
        and(
          lt(obligations.health_factor, "1.0"),
          eq(obligations.is_liquidated, false)
        )
      )
      .orderBy(obligations.health_factor)
      .limit(limit);
  }
};