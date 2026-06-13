// each reserve represents the lending market like usdc, sol etc
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Reserve {
    pub protocol: Pubkey, // reserve belongs to which protocol
    pub liquidity_mint: Pubkey, // mint of token (sol, usdc etc)
    pub liquidity_vault: Pubkey, // where user money is stored
    pub collateral_mint: Pubkey, // 100 sol -> 100 csol (collateral token)
    pub oracle: Pubkey, // to fetch the latest price
    pub total_liquidity: u64, // total amount of liquidity in reserve 
    pub total_borrowed: u64, // total amount of borrowed money
    pub cumulative_borrow_rate_wads: u128, // global intrest index, used to calculate intrest when needed
    pub loan_to_value_ratio: u64, // minimum borrowing limit
    pub liquidation_threshold: u64,// when loan to value ratio exceeds this, position can be liquidated
    pub liquidation_bonus: u64, // when position is liquidated, liquidator gets this bonus
    pub last_update_slot: u64,
    pub is_active: bool,
    pub bump: u8,
}

impl Reserve {
    pub const LEN: usize = 241;
}
