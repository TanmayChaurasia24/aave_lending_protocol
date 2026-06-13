use crate::constants::*;
use crate::helper::update_cumulative_borrow_rate;
use crate::state::Reserve;
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<AccrueInterest>) -> Result<()> {
    let reserve = &mut ctx.accounts.reserve;

    let current_slot = Clock::get()?.slot;
    let slots_elapsed = current_slot
        .checked_sub(reserve.last_update_slot)
        .unwrap_or(0);

    if slots_elapsed == 0 {
        return Ok(());
    }

    let new_rate = update_cumulative_borrow_rate(
        reserve.cumulative_borrow_rate_wads,
        reserve.total_borrowed,
        reserve.total_liquidity,
        slots_elapsed,
    )?;

    reserve.cumulative_borrow_rate_wads = new_rate;
    reserve.last_update_slot = current_slot;

    msg!(
        "Interest accrued: reserve={}, new_rate={}, slots_elapsed={}",
        reserve.key(),
        new_rate,
        slots_elapsed,
    );

    Ok(())
}

#[derive(Accounts)]
pub struct AccrueInterest<'info> {
    #[account(
        mut,
        seeds = [RESERVE_SEED, reserve.liquidity_mint.as_ref()],
        bump = reserve.bump,
    )]
    pub reserve: Account<'info, Reserve>,
}
