// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

library Constants {
    uint256 internal constant FP_DECIMALS = 18;

    uint256 internal constant FP_SCALING_FACTOR = 10 ** FP_DECIMALS;

    uint256 internal constant ONE_HUNDRED_PERCENT = 1 ether;
    uint256 internal constant ONE_PERCENT = 0.01 ether;

    uint256 internal constant BASIS_POINT = 1e14;

    /// @dev The maximum configurable close fee.
    uint256 internal constant MAX_CLOSE_FEE = 0.1 ether; // 10%

    /// @dev The maximum configurable open fee.
    uint256 internal constant MAX_OPEN_FEE = 0.1 ether; // 10%

    /// @dev The maximum configurable protocol fee per asset for collateral pool swaps.
    uint256 internal constant MAX_COLLATERAL_POOL_PROTOCOL_FEE = 0.5 ether; // 50%

    /// @dev The minimum configurable minimum collateralization ratio.
    uint256 internal constant MIN_COLLATERALIZATION_RATIO = ONE_HUNDRED_PERCENT;

    /// @dev The minimum configurable liquidation incentive multiplier.
    /// This means liquidator only receives equal amount of collateral to debt repaid.
    uint256 internal constant MIN_LIQUIDATION_INCENTIVE_MULTIPLIER = ONE_HUNDRED_PERCENT;

    /// @dev The maximum configurable liquidation incentive multiplier.
    /// This means liquidator receives 25% bonus collateral compared to the debt repaid.
    uint256 internal constant MAX_LIQUIDATION_INCENTIVE_MULTIPLIER = 1.25 ether; // 125%

    /// @dev The minimum collateral amount for a kresko asset.
    uint256 internal constant MIN_KRASSET_COLLATERAL_AMOUNT = 1e12;

    /// @dev The maximum configurable minimum debt USD value. 8 decimals.
    uint256 internal constant MAX_MIN_DEBT_VALUE = 1_000 * 1e8; // $1,000
}
