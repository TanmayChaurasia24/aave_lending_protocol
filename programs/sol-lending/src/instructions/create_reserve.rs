use crate::constants::*;
use crate::error::LendingError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

pub fn handler(
    ctx: Context<CreateReserve>,
    loan_to_value_ratio: u64,
    liquidation_threshold: u64,
    liquidation_bonus: u64,
) -> Result<()> {
    require!(
        ctx.accounts.authority.key() == ctx.accounts.protocol.admin,
        LendingError::Unauthorized
    );

    let reserve = &mut ctx.accounts.reserve;

    reserve.protocol = ctx.accounts.protocol.key();
    reserve.liquidity_mint = ctx.accounts.liquidity_mint.key();
    reserve.liquidity_vault = ctx.accounts.liquidity_vault.key();
    reserve.collateral_mint = ctx.accounts.collateral_mint.key();
    reserve.oracle = Pubkey::default();
    reserve.total_liquidity = 0;
    reserve.total_borrowed = 0;
    reserve.cumulative_borrow_rate_wads = INITIAL_CUMULATIVE_BORROW_RATE;
    reserve.loan_to_value_ratio = loan_to_value_ratio;
    reserve.liquidation_threshold = liquidation_threshold;
    reserve.liquidation_bonus = liquidation_bonus;
    reserve.last_update_slot = Clock::get()?.slot;
    reserve.is_active = true;
    reserve.bump = ctx.bumps.reserve;

    let protocol = &mut ctx.accounts.protocol;
    protocol.reserve_count = protocol.reserve_count.checked_add(1).unwrap();

    Ok(())
}

#[derive(Accounts)]
pub struct CreateReserve<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol.bump
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        init,
        payer = authority,
        space = Reserve::LEN,
        seeds = [
            b"reserve",
            liquidity_mint.key().as_ref()
        ],
        bump
    )]
    pub reserve: Account<'info, Reserve>,

    pub liquidity_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = authority,
        seeds = [VAULT_SEED, reserve.key().as_ref()],
        bump,
        token::mint = liquidity_mint,
        token::authority = reserve,
        token::token_program = token_program
    )]
    pub liquidity_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [COLLATERAL_MINT_SEED, reserve.key().as_ref()],
        bump,
        mint::decimals = liquidity_mint.decimals,
        mint::authority = reserve,
        mint::token_program = token_program,
    )]
    pub collateral_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}
