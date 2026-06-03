use anchor_lang::prelude::*;
use crate::state::mod::Reserve;

pub fn handler(ctx: Context<CreateReserve>) -> Result<()>{
    let reserve = &mut ctx.accounts.reserve;

    reserve.protocol = ctx.accounts.protocol.key();
    reserve.liquidity_mint = ctx.accounts.liquidity_mint.key();
    reserve.total_liquidity = 0;
    reserve.total_borrowed = 0;
    reserve.loan_to_value_ratio = 75;
    reserve.liquidation_threshold = 85;
    reserve.liquidation_bonus = 5;
    
    Ok(())
}

#[derive(Accounts)]
pub struct CreateReserve<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"protocol"],
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

    pub liquidity_mint: InterfaceAccount<'info, Mint>

    pub system_program: Program<'info, System>
}