use anchor_lang::prelude::*;
use crate::state::*;

pub fn handler(
    ctx: Context<InitializeProtocol>,
    treasury: Pubkey,
    protocol_fee_bps: u16,
) -> Result<()> {

    let protocol = &mut ctx.accounts.protocol;

    protocol.admin = ctx.accounts.authority.key();
    protocol.treasury = treasury;
    protocol.reserve_count = 0;
    protocol.protocol_fee_bps = protocol_fee_bps;
    protocol.is_paused = false;
    protocol.bump = ctx.bumps.protocol;

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        seeds = [b"protocol"],
        bump,
        space = Protocol::LEN,
    )]
    pub protocol: Account<'info, Protocol>,
    
    pub system_program: Program<'info, System>
}