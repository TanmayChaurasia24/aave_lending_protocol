use crate::constants::*;
use crate::error::LendingError;
use crate::state::{Obligation, Protocol, Reserve};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    mint_to, transfer_checked, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked,
};

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(
        !ctx.accounts.protocol.is_paused,
        LendingError::ProtocolPaused
    );

    require!(
        !ctx.accounts.reserve.is_active,
        LendingError::ReserveNotActive
    );

        require!(amount > 0, LendingError::InsufficientCollateral);

    // cpi for user wallet to vault
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
        amount,
        ctx.accounts.liquidity_mint.decimals,
    )?;

    // mint collateral tokens
    let reserve_key = ctx.accounts.reserve.key();
    let seeds = &[
        RESERVE_SEED,
        ctx.accounts.liquidity_mint.to_account_info().key.as_ref(),
        &[ctx.accounts.reserve.bump],
    ];

    let signer_seeds = &[&seeds[..]];

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.collateral_mint.to_account_info(),
                to: ctx.accounts.user_collateral_account.to_account_info(),
                authority: ctx.accounts.reserve.to_account_info(),
            },
            signer_seeds
        ),
        amount,
    )?;

    let reserve = &mut ctx.accounts.reserve;
    reserve.total_liquidity = reserve
        .total_liquidity
        .checked_add(amount)
        .ok_or(LendingError::MathOverflow)?;

    let obligation = &mut ctx.accounts.obligation;
    obligation.deposited_amount = obligation
        .deposited_amount
        .checked_add(amount)
        .ok_or(LendingError::MathOverflow)?;
    obligation.last_update_slot = Clock::get()?.slot;

    Ok(())
}



#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [PROTOCOL_SEED],
        bump = protocol.bump
    )]
    pub protocol: Box<Account<'info, Protocol>>,

    #[account(
        mut,
        seeds = [RESERVE_SEED, liquidity_mint.key().as_ref()],
        bump = reserve.bump
    )]
    pub reserve: Box<Account<'info, Reserve>>,

    #[account(
        init_if_needed,
        payer = user,
        space = Obligation::LEN,
        seeds = [OBLIGATION_SEED, reserve.key().as_ref(), user.key().as_ref()],
        bump,
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
        init_if_needed,
        payer = user,
        seeds = [USER_COLLATERAL_ACCOUNT_SEED, reserve.key().as_ref(), user.key().as_ref()],
        bump,
        token::mint = collateral_mint,
        token::authority = user,
        token::token_program = token_program,
    )]
    pub user_collateral_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
