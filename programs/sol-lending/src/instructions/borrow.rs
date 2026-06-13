use crate::constants::*;
use crate::error::LendingError;
use crate::helper::calculate_outstanding_debt;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

pub fn handler(ctx: Context<Borrow>, amount: u64) -> Result<()> {
    require!(
        !ctx.accounts.protocol.is_paused,
        LendingError::ProtocolPaused
    );
    require!(
        ctx.accounts.reserve.is_active,
        LendingError::ReserveNotActive
    );
    require!(amount > 0, LendingError::InsufficientCollateral);

    let reserve = &ctx.accounts.reserve;
    let obligation = &ctx.accounts.obligation;

    require!(
        reserve.total_liquidity >= amount,
        LendingError::InsufficientLiquidity
    );

    let existing_debt = calculate_outstanding_debt(
        obligation.borrowed_amount,
        obligation.borrow_index_snapshot,
        reserve.cumulative_borrow_rate_wads,
    )?;

    let total_borrow_after = existing_debt
        .checked_add(amount)
        .ok_or(LendingError::MathOverflow)?;

    let max_borrow = obligation
        .deposited_amount
        .checked_mul(reserve.loan_to_value_ratio)
        .ok_or(LendingError::MathOverflow)?
        .checked_div(100)
        .ok_or(LendingError::MathOverflow)?;

    require!(total_borrow_after <= max_borrow, LendingError::ExceedsLTV);

    // token transfer from vault to user wallet
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
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.reserve.to_account_info(),
                mint: ctx.accounts.liquidity_mint.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
        ctx.accounts.liquidity_mint.decimals,
    )?;

    let reserve = &mut ctx.accounts.reserve;
    reserve.total_liquidity = reserve
        .total_liquidity
        .checked_sub(amount)
        .ok_or(LendingError::MathOverflow)?;

    reserve.total_liquidity = reserve
        .total_liquidity
        .checked_sub(amount)
        .ok_or(LendingError::MathOverflow)?;

    let obligation = &mut ctx.accounts.obligation;

    obligation.borrowed_amount = total_borrow_after;
    obligation.borrow_index_snapshot = reserve.cumulative_borrow_rate_wads;
    obligation.last_update_slot = Clock::get()?.slot;

    Ok(())
}

#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

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
        seeds = [OBLIGATION_SEED, reserve.key().as_ref(), user.key().as_ref()],
        bump = obligation.bump,
        has_one = owner @ LendingError::Unauthorized,
    )]
    pub obligation: Box<Account<'info, Obligation>>,

    /// CHECK: validated by has_one constraint on obligation
    pub owner: AccountInfo<'info>,

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
        token::authority = user,
    )]
    pub user_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
