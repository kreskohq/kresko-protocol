// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

/* -------------------------------------------------------------------------- */
/*                                 Parameters                                 */
/* -------------------------------------------------------------------------- */

uint256 constant ONE_HUNDRED_PERCENT = 1e18;

/// @dev The maximum configurable burn fee.
uint256 constant MAX_BURN_FEE = 5e16; // 5%

/// @dev The minimum configurable minimum collateralization ratio.
uint256 constant MIN_COLLATERALIZATION_RATIO = ONE_HUNDRED_PERCENT;

/// @dev The minimum configurable liquidation incentive multiplier.
/// This means liquidator only receives equal amount of collateral to debt repaid.
uint256 constant MIN_LIQUIDATION_INCENTIVE_MULTIPLIER = ONE_HUNDRED_PERCENT;

/// @dev The maximum configurable liquidation incentive multiplier.
/// This means liquidator receives 25% bonus collateral compared to the debt repaid.
uint256 constant MAX_LIQUIDATION_INCENTIVE_MULTIPLIER = 1.25e18; // 125%

/// @dev The maximum configurable minimum debt USD value.
uint256 constant MAX_DEBT_VALUE = 1000e18; // $1,000
