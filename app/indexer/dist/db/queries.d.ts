import { obligations } from "./schema";
export declare const dbQueries: {
    getObligation(pubkey: string): Promise<{
        pubkey: string;
        owner: string;
        reserve: string;
        deposited_amount: string;
        borrowed_amount_principal: string;
        calculated_debt: string;
        health_factor: string;
        is_liquidated: boolean;
        last_update_slot: number;
        updated_at: Date;
    }[]>;
    updateObligationMetrics(pubkey: string, updates: Partial<typeof obligations.$inferInsert>): Promise<import("postgres").RowList<never[]>>;
    getLiquidatablePositions(limit?: number): Promise<{
        pubkey: string;
        owner: string;
        reserve: string;
        deposited_amount: string;
        borrowed_amount_principal: string;
        calculated_debt: string;
        health_factor: string;
        is_liquidated: boolean;
        last_update_slot: number;
        updated_at: Date;
    }[]>;
};
//# sourceMappingURL=queries.d.ts.map