use anchor_lang::prelude::*;

// Import our modules
mod constants;
mod error;
mod helper;
mod instructions;
mod state;

// Use all instruction handlers and account structs
use instructions::*;

declare_id!("Gqo5WJ92Ja8G4hsvLA8QKbJcaEB8CBmEnZE5wyQruewa");

#[program]
pub mod sol_lending {
    use super::*;

    /// Admin: Initialize the protocol with treasury and fee config.
    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        treasury: Pubkey,
        protocol_fee_bps: u16,
    ) -> Result<()> {
        instructions::initialize_protocol::handler(ctx, treasury, protocol_fee_bps)
    }

    /// Admin: Create a new reserve (lending market) for a specific token.
    pub fn create_reserve(
        ctx: Context<CreateReserve>,
        loan_to_value_ratio: u64,
        liquidation_threshold: u64,
        liquidation_bonus: u64,
    ) -> Result<()> {
        instructions::create_reserve::handler(
            ctx,
            loan_to_value_ratio,
            liquidation_threshold,
            liquidation_bonus,
        )
    }

    /// User: Deposit tokens as collateral and receive collateral tokens.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    /// User: Borrow tokens against deposited collateral.
    pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
        instructions::borrow::handler(ctx, amount)
    }

    /// User: Repay borrowed tokens. Pass u64::MAX to repay everything.
    pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
        instructions::repay::handler(ctx, amount)
    }

    /// User: Withdraw deposited collateral. Checks health factor.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, amount)
    }

    /// Bot/User: Liquidate an unhealthy position for a bonus.
    pub fn liquidate(ctx: Context<Liquidate>, repay_amount: u64) -> Result<()> {
        instructions::liquidate::handler(ctx, repay_amount)
    }

    /// Bot: Accrue interest on a reserve. Permissionless.
    pub fn accrue_interest(ctx: Context<AccrueInterest>) -> Result<()> {
        instructions::accrue_interest::handler(ctx)
    }
}
