use crate::constants::*;
use crate::error::LendingError;
use crate::helper::{calculate_health_factor, calculate_outstanding_debt};
use crate::state::{Obligation, Protocol, Reserve};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    burn, transfer_checked, Burn, Mint, TokenAccount, TokenInterface, TransferChecked,
};

pub fn handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    require!(
        !ctx.accounts.protocol.is_paused,
        LendingError::ProtocolPaused
    );

    let reserve = &ctx.accounts.reserve;
    let obligation = &ctx.accounts.obligation;

    require!(
        obligation.deposited_amount >= amount,
        LendingError::InsufficientCollateral,
    );

    require!(
        reserve.total_liquidity >= amount,
        LendingError::InsufficientLiquidity,
    );

    let outstanding_debt = calculate_outstanding_debt(
        obligation.borrowed_amount,
        obligation.borrow_index_snapshot,
        reserve.cumulative_borrow_rate_wads,
    )?;

    if outstanding_debt > 0 {
        let new_collateral = obligation
            .deposited_amount
            .checked_sub(amount)
            .ok_or(LendingError::MathOverflow)?;

        let health_factor = calculate_health_factor(
            new_collateral,
            outstanding_debt,
            reserve.liquidation_threshold,
        );

        require!(
            health_factor >= 10_000,
            LendingError::WithdrawalWouldLiquidate,
        );
    }

    burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.collateral_mint.to_account_info(),
                from: ctx.accounts.user_collateral_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
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

    let obligation = &mut ctx.accounts.obligation;
    obligation.deposited_amount = obligation
        .deposited_amount
        .checked_sub(amount)
        .ok_or(LendingError::MathOverflow)?;
    obligation.last_update_slot = Clock::get()?.slot;

    Ok(())
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
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
    )]
    pub obligation: Box<Account<'info, Obligation>>,

    pub liquidity_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        seeds = [VAULT_SEED, reserve.key().as_ref()],
        bump,
    )]
    pub liquidity_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [COLLATERAL_MINT_SEED, reserve.key().as_ref()],
        bump,
    )]
    pub collateral_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        token::mint = liquidity_mint,
        token::authority = user,
    )]
    pub user_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [USER_COLLATERAL_ACCOUNT_SEED, reserve.key().as_ref(), user.key().as_ref()],
        bump,
        token::mint = collateral_mint,
        token::authority = user,
    )]
    pub user_collateral_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
