use crate::constants::*;
use crate::error::LendingError;
use crate::helper::calculate_outstanding_debt;
use crate::state::{Obligation, Protocol, Reserve};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

pub fn handler(
    ctx: Context<Repay>,
    amount: u64
) -> Result<()> {
    require!(!ctx.accounts.protocol.is_paused, LendingError::ProtocolPaused);

    let reserve = &ctx.accounts.reserve;
    let obligation = &ctx.accounts.obligation;

    let outstanding_debt = calculate_outstanding_debt(
        obligation.borrowed_amount,
        obligation.borrow_index_snapshot,
        reserve.cumulative_borrow_rate_wads
    )?;

    let repay_amount = amount.min(outstanding_debt);

    require!(repay_amount > 0, LendingError::RepayExceedsBorrow);

    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.liquidity_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
                mint: ctx.accounts.liquidity_mint.to_account_info(),
            },
        ),
        repay_amount,
        ctx.accounts.liquidity_mint.decimals
    )?;

    let reserve = &mut ctx.accounts.reserve;

    reserve.total_borrowed = reserve.total_borrowed.saturating_sub(repay_amount);

    let obligation = &mut ctx.accounts.obligation;

    let remaining_debt = outstanding_debt.checked_sub(repay_amount).ok_or(LendingError::MathOverflow)?;

    obligation.borrowed_amount = remaining_debt;
    obligation.borrow_index_snapshot = reserve.cumulative_borrow_rate_wads;
    obligation.last_update_slot = Clock::get()?.slot;

    Ok(())
}


#[derive(Accounts)]
pub struct Repay<'info> {
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
        token::mint = liquidity_mint,
        token::authority = user,
    )]
    pub user_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info,System>
}