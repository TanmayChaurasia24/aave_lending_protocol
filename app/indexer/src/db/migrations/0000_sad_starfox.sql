CREATE TABLE "obligations" (
	"pubkey" varchar(44) PRIMARY KEY NOT NULL,
	"owner" varchar(44) NOT NULL,
	"reserve" varchar(44) NOT NULL,
	"deposited_amount" numeric(38, 0) NOT NULL,
	"borrowed_amount_principal" numeric(38, 0) NOT NULL,
	"calculated_debt" numeric(38, 0) NOT NULL,
	"health_factor" numeric(16, 6) NOT NULL,
	"is_liquidated" boolean DEFAULT false NOT NULL,
	"last_update_slot" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reserves" (
	"pubkey" varchar(44) PRIMARY KEY NOT NULL,
	"liquidity_mint" varchar(44) NOT NULL,
	"total_liquidity" numeric(38, 0) NOT NULL,
	"total_borrowed" numeric(38, 0) NOT NULL,
	"cumulative_borrow_rate" numeric(38, 0) NOT NULL,
	"loan_to_value_ratio" integer NOT NULL,
	"liquidation_threshold" integer NOT NULL,
	"current_price_usd" numeric(18, 6) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_update_slot" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_cursor" (
	"id" varchar(20) PRIMARY KEY DEFAULT 'default' NOT NULL,
	"last_processed_slot" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_reserve_reserves_pubkey_fk" FOREIGN KEY ("reserve") REFERENCES "public"."reserves"("pubkey") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "obligation_owner_idx" ON "obligations" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "obligation_risk_idx" ON "obligations" USING btree ("health_factor","is_liquidated");