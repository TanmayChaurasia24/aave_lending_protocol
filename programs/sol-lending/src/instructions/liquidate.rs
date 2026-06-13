use crate::constants::*;
use crate::error::LendingError;
use crate::helper::{calculate_health_factor, calculate_outstanding_debt};
use crate::state::{Obligation, Protocol, Reserve};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

pub fn handler(ctx: Context<Liquidate>, repay_amount: u64) -> Result<()> {
    require!(
        !ctx.accounts.protocol.is_paused,
        LendingError::ProtocolPaused
    );

    let reserve = &ctx.accounts.reserve;
    let obligation = &ctx.accounts.obligation;

    let outstanding_debt = calculate_outstanding_debt(
        obligation.borrowed_amount,
        obligation.borrow_index_snapshot,
        reserve.cumulative_borrow_rate_wads,
    )?;

    let health_factor = calculate_health_factor(
        obligation.deposited_amount,
        outstanding_debt,
        reserve.liquidation_threshold,
    );

    require!(health_factor < 10_000, LendingError::HealthyObligation);

    let max_repay = outstanding_debt / 2; // 50% close factor
    let actual_repay = repay_amount.min(max_repay).min(outstanding_debt);

    let collateral_to_seize = (actual_repay as u128)
        .checked_mul(100u128 + reserve.liquidation_bonus as u128)
        .ok_or(LendingError::MathOverflow)?
        .checked_div(100)
        .ok_or(LendingError::MathOverflow)? as u64;

    let collateral_to_seize = collateral_to_seize.min(obligation.deposited_amount);

    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.liquidator_token_account.to_account_info(),
                to: ctx.accounts.liquidity_vault.to_account_info(),
                authority: ctx.accounts.liquidator.to_account_info(),
                mint: ctx.accounts.liquidity_mint.to_account_info(),
            },
        ),
        actual_repay,
        ctx.accounts.liquidity_mint.decimals,
    )?;

    let seeds = &[
        RESERVE_SEED,
        ctx.accounts.liquidity_mint.to_account_info().key.as_ref(),
        &[reserve.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.liquidity_vault.to_account_info(),
                to: ctx.accounts.liquidator_receive_account.to_account_info(),
                authority: ctx.accounts.reserve.to_account_info(),
                mint: ctx.accounts.liquidity_mint.to_account_info(),
            },
            signer_seeds,
        ),
        collateral_to_seize,
        ctx.accounts.liquidity_mint.decimals,
    )?;

    let reserve = &mut ctx.accounts.reserve;

    reserve.total_liquidity = reserve
        .total_liquidity
        .checked_add(actual_repay)
        .ok_or(LendingError::MathOverflow)?;

    reserve.total_liquidity = reserve
        .total_liquidity
        .checked_sub(collateral_to_seize)
        .ok_or(LendingError::MathOverflow)?;

    reserve.total_borrowed = reserve.total_borrowed.saturating_sub(actual_repay);

    let obligation = &mut ctx.accounts.obligation;

    let remaining_debt = outstanding_debt
        .checked_sub(actual_repay)
        .ok_or(LendingError::MathOverflow)?;

    obligation.borrowed_amount = remaining_debt;
    obligation.borrow_index_snapshot = reserve.cumulative_borrow_rate_wads;
    obligation.deposited_amount = obligation
        .deposited_amount
        .checked_sub(collateral_to_seize)
        .ok_or(LendingError::MathOverflow)?;
    obligation.last_update_slot = Clock::get()?.slot;

    if remaining_debt == 0 {
        obligation.is_liquidated = true;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct Liquidate<'info> {
    #[account(mut)]
    pub liquidator: Signer<'info>,

    #[account(
        seeds = [PROTOCOL_SEED],
        bump = protocol.bump,
    )]
    pub protocol: Box<Account<'info, Protocol>>,

    #[account(
        mut,
        seeds = [RESERVE_SEED, liquidity_mint.key().as_ref()],
        bump = reserve.bump,
    )]
    pub reserve: Box<Account<'info, Reserve>>,

    #[account(
        mut,
        seeds = [OBLIGATION_SEED, reserve.key().as_ref(), borrower.key().as_ref()],
        bump = obligation.bump,
    )]
    pub obligation: Box<Account<'info, Obligation>>,

    /// CHECK: borrower is just used for PDA derivation for obligation

    pub borrower: AccountInfo<'info>,

    pub liquidity_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        seeds = [VAULT_SEED, reserve.key().as_ref()],
        bump,
    )]
    pub liquidity_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = liquidity_mint,
        token::authority = liquidator,
    )]
    pub liquidator_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = liquidity_mint,
        token::authority = liquidator,
    )]
    pub liquidator_receive_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
