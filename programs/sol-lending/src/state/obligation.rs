// tracks user position

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Obligation {
    pub owner: Pubkey, // who owns this position
    pub reserve: Pubkey, // market
    pub deposited_amount: u64, // collateral provided
    pub borrowed_amount: u64, // amount borrowed
    pub borrow_index_snapshot: u128, // snapshot of the borrow index at the time of borrowing
    pub last_update_slot: u64,
    pub isliquidated: bool,
    pub bump: u8,
}

impl Obligation {
    pub const LEN: usize = 120;
}