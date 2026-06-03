use anchor_lang::prelude::*;

#[error_code]
pub enum LendingError {
    /// Thrown when someone tries to call an admin-only instruction
    /// but they are not the protocol admin.
    #[msg("You are not the protocol admin")]
    Unauthorized,           // 6000

    /// Thrown when the protocol is paused (e.g., during an emergency).
    /// All user-facing instructions should check this.
    #[msg("Protocol is currently paused")]
    ProtocolPaused,         // 6001

    /// Thrown when a reserve has been deactivated by the admin.
    /// Prevents deposits/borrows into a dead market.
    #[msg("This reserve is not active")]
    ReserveNotActive,       // 6002

    /// Thrown when a user tries to borrow more than their collateral allows.
    /// Their borrow_value / collateral_value exceeds the LTV ratio.
    #[msg("Borrow would exceed the loan-to-value limit")]
    ExceedsLTV,             // 6003

    /// Thrown in liquidation when the user's position is still healthy.
    /// Health factor >= 1.0 means no liquidation is allowed.
    #[msg("This obligation is not eligible for liquidation")]
    HealthyObligation,      // 6004

    /// Thrown when a user tries to withdraw more collateral than they deposited.
    #[msg("Insufficient collateral deposited")]
    InsufficientCollateral, // 6005

    /// Thrown when a user tries to repay more than they owe.
    #[msg("Repay amount exceeds outstanding borrow")]
    RepayExceedsBorrow,     // 6006

    /// Thrown when the reserve's vault doesn't have enough tokens
    /// to fulfill a borrow or withdrawal.
    #[msg("Not enough liquidity in the reserve")]
    InsufficientLiquidity,  // 6007

    /// Thrown when math overflows (e.g., multiplying two huge u128s).
    #[msg("Math overflow occurred")]
    MathOverflow,           // 6008

    /// Thrown when trying to withdraw collateral would make the position
    /// unhealthy (health factor < 1.0).
    #[msg("Withdrawal would make position unhealthy")]
    WithdrawalWouldLiquidate, // 6009

    /// Thrown when the oracle returns a zero or negative price.
    #[msg("Invalid oracle price")]
    InvalidOraclePrice,     // 6010
}