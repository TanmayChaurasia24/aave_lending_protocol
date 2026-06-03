use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Protocol {
    pub admin: Pubkey,
    pub treasury: Pubkey, // users intrest goes here
    pub market_count: u64, // number of lending markets
    pub protocol_fee_bps: u16, // profit that protocol takes from interest
    pub is_paused: bool, 
    pub bump: u8,
}

impl Protocol {
    pub const LEN: usize = 105;
}