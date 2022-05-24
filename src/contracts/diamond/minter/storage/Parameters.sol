// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

/// @dev Global parameters for the minting protocol

uint256 constant ONE_HUNDRED_PERCENT = 1e18;

//  The maximum configurable burn fee.
uint256 constant MAX_BURN_FEE = 5e16; // 5%

// The minimum configurable minimum collateralization ratio.
uint256 constant MIN_COLLATERALIZATION_RATIO = 1e18; // 100%

// The minimum configurable liquidation incentive multiplier.
// This means liquidator only receives equal amount of collateral to debt repaid.
uint256 constant MIN_LIQUIDATION_INCENTIVE_MULTIPLIER = 1e18; // 100%

// The maximum configurable liquidation incentive multiplier.
// This means liquidator receives 25% bonus collateral compared to the debt repaid.
uint256 constant MAX_LIQUIDATION_INCENTIVE_MULTIPLIER = 1.25e18; // 125%

// The maximum configurable minimum debt USD value.
uint256 constant MAX_DEBT_VALUE = 1000e18; // $1,000
