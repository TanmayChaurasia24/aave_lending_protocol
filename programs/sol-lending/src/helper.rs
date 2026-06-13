use crate::constants::*;
use crate::error::LendingError;
use anchor_lang::prelude::*;

pub fn calculate_interest_rate_bps (total_borrowed: u64, total_liquidity: u64) -> u64 {
    if total_liquidity == 0 {
        return BASE_RATE_BPS;
    }

    let utilization_bps: u64 = (total_borrowed as u128)
        .checked_mul(10_000)
        .unwrap()
        .checked_div(total_liquidity as u128)
        .unwrap() as u64;

    if utilization_bps <= KINK_UTILIZATION_BPS {
        // gentle slope

        let slope_contribution = SLOPE1_BPS
            .checked_mul(utilization_bps)
            .unwrap()
            .checked_div(KINK_UTILIZATION_BPS)
            .unwrap();

        BASE_RATE_BPS.checked_add(slope_contribution).unwrap()
    } else {
        let excess_utilization = utilization_bps.checked_sub(KINK_UTILIZATION_BPS).unwrap();

        let remaining_capacity = 10_000u64.checked_sub(KINK_UTILIZATION_BPS).unwrap();

        let slope2_contribution = SLOPE2_BPS.checked_mul(excess_utilization).unwrap()
        .checked_div(remaining_capacity).unwrap();

        BASE_RATE_BPS
            .checked_add(SLOPE1_BPS)
            .unwrap()
            .checked_add(slope2_contribution)
            .unwrap()
    }
}

pub fn update_cumulative_borrow_rate(
    current_rate: u128,
    total_borrowed: u64,
    total_liquidity: u64,
    slots_elapsed: u64,
) -> Result<u128> {
    if slots_elapsed == 0 {
        return Ok(current_rate);
    }

    let annual_rate_bps = calculate_interest_rate_bps(total_borrowed, total_liquidity);

    let per_slot_rate_wad: u128 = (annual_rate_bps as u128)
    .checked_mul(WAD)
    .ok_or(LendingError::MathOverflow)?
    .checked_div(10_000)
    .ok_or(LendingError::MathOverflow)?;

    let intrest_factor: u128 = WAD.checked_add(
        per_slot_rate_wad.checked_mul(slots_elapsed as u128)
        .ok_or(LendingError::MathOverflow)?
    )
    .ok_or(LendingError::MathOverflow)?;


    let new_rate: u128 = current_rate
        .checked_mul(intrest_factor)
        .ok_or(LendingError::MathOverflow)?
        .checked_div(WAD)
        .ok_or(LendingError::MathOverflow)?;

    Ok(new_rate)
}

pub fn calculate_outstanding_debt(
    borrowed_amount: u64,
    borrow_index_snapshot: u128,
    current_cumulative_rate: u128,
) -> Result<u64> {
    if borrowed_amount == 0 {
        return Ok(0);
    }

    let debt: u128 = (borrowed_amount as u128)
    .checked_mul(current_cumulative_rate)
    .ok_or(LendingError::MathOverflow)?
    .checked_div(borrow_index_snapshot)
    .ok_or(LendingError::MathOverflow)?;

    Ok(debt as u64)
}

pub fn calculate_health_factor(
    collateral_value: u64,
    borrow_value: u64,
    liquidation_threshold: u64,
) -> u64 {
    if borrow_value == 0 {
        return u64::MAX;
    }

    (collateral_value as u128)
        .checked_mul(liquidation_threshold as u128)
        .unwrap()
        .checked_mul(100)
        .unwrap()
        .checked_div(borrow_value as u128)
        .unwrap_or(u64::MAX as u128) as u64
}