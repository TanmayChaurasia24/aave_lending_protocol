CREATE TABLE "indexer_cursor" (
	"key" text PRIMARY KEY NOT NULL,
	"slot" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indexer_lock" (
	"key" text PRIMARY KEY NOT NULL,
	"holder" text NOT NULL,
	"pid" integer NOT NULL,
	"acquired_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interest_accrual_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "interest_accrual_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tx_signature" varchar(88) NOT NULL,
	"reserve_pubkey" varchar(44) NOT NULL,
	"token_mint" varchar(44) NOT NULL,
	"slot" bigint NOT NULL,
	"elapsed_seconds" integer NOT NULL,
	"old_cumulative_index" numeric(40, 0) NOT NULL,
	"new_cumulative_index" numeric(40, 0) NOT NULL,
	"borrow_rate_bps" integer NOT NULL,
	"utilisation_rate" numeric(10, 8) NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	CONSTRAINT "interest_accrual_events_tx_signature_unique" UNIQUE("tx_signature")
);
--> statement-breakpoint
CREATE TABLE "lending_pools" (
	"pubkey" varchar(44) PRIMARY KEY NOT NULL,
	"authority" varchar(44) NOT NULL,
	"paused" boolean NOT NULL,
	"total_reserves" integer NOT NULL,
	"last_slot" bigint NOT NULL,
	"last_updated" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "liquidation_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "liquidation_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tx_signature" varchar(88) NOT NULL,
	"slot" bigint NOT NULL,
	"borrower" varchar(44) NOT NULL,
	"liquidator" varchar(44) NOT NULL,
	"collateral_mint" varchar(44) NOT NULL,
	"debt_mint" varchar(44) NOT NULL,
	"collateral_seized" numeric(28, 0) NOT NULL,
	"debt_repaid" numeric(28, 0) NOT NULL,
	"collateral_seized_usd" numeric(20, 8) NOT NULL,
	"debt_repaid_usd" numeric(20, 8) NOT NULL,
	"liquidator_profit_usd" numeric(20, 8) NOT NULL,
	"health_factor_at_liquidation" numeric(20, 8) NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	CONSTRAINT "liquidation_events_tx_signature_unique" UNIQUE("tx_signature")
);
--> statement-breakpoint
CREATE TABLE "oracle_prices" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "oracle_prices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"token_mint" varchar(44) NOT NULL,
	"price_usd" numeric(20, 8) NOT NULL,
	"confidence" numeric(20, 8) NOT NULL,
	"exponent" smallint NOT NULL,
	"oracle_pubkey" varchar(44) NOT NULL,
	"slot" bigint NOT NULL,
	"timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reserves" (
	"pubkey" varchar(44) PRIMARY KEY NOT NULL,
	"token_mint" varchar(44) NOT NULL,
	"vault" varchar(44) NOT NULL,
	"total_deposits" numeric(28, 0) NOT NULL,
	"total_borrows" numeric(28, 0) NOT NULL,
	"utilisation_rate" numeric(10, 8) NOT NULL,
	"borrow_rate_bps" integer NOT NULL,
	"cumulative_index" numeric(40, 0) NOT NULL,
	"ltv_ratio" integer NOT NULL,
	"liquidation_threshold" integer NOT NULL,
	"liquidation_bonus" integer NOT NULL,
	"oracle" varchar(44) NOT NULL,
	"last_slot" bigint NOT NULL,
	"last_updated" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_positions" (
	"pubkey" varchar(44) PRIMARY KEY NOT NULL,
	"owner" varchar(44) NOT NULL,
	"reserve" varchar(44) NOT NULL,
	"token_mint" varchar(44) NOT NULL,
	"deposited_amount" numeric(28, 0) NOT NULL,
	"borrowed_amount" numeric(28, 0) NOT NULL,
	"borrow_index_at_open" numeric(40, 0) NOT NULL,
	"health_factor" numeric(20, 8),
	"at_risk" boolean NOT NULL,
	"collateral_value_usd" numeric(20, 8) NOT NULL,
	"debt_value_usd" numeric(20, 8) NOT NULL,
	"last_slot" bigint NOT NULL,
	"last_updated" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_positions" ADD CONSTRAINT "user_positions_reserve_reserves_pubkey_fk" FOREIGN KEY ("reserve") REFERENCES "public"."reserves"("pubkey") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interest_accrual_reserve_slot_idx" ON "interest_accrual_events" USING btree ("reserve_pubkey","slot" DESC);--> statement-breakpoint
CREATE INDEX "liquidation_borrower_idx" ON "liquidation_events" USING btree ("borrower");--> statement-breakpoint
CREATE INDEX "liquidation_liquidator_idx" ON "liquidation_events" USING btree ("liquidator");--> statement-breakpoint
CREATE INDEX "liquidation_timestamp_idx" ON "liquidation_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "oracle_prices_token_mint_slot_idx" ON "oracle_prices" USING btree ("token_mint","slot" DESC);--> statement-breakpoint
CREATE INDEX "reserve_token_mint_idx" ON "reserves" USING btree ("token_mint");--> statement-breakpoint
CREATE INDEX "user_position_owner_idx" ON "user_positions" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "user_position_at_risk_idx" ON "user_positions" USING btree ("at_risk") WHERE "user_positions"."at_risk" = TRUE;--> statement-breakpoint
CREATE INDEX "user_position_health_factor_idx" ON "user_positions" USING btree ("health_factor") WHERE "user_positions"."health_factor" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "user_position_reserve_idx" ON "user_positions" USING btree ("reserve");