// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {AggregatorV2V3Interface} from "../vendor/flux/interfaces/AggregatorV2V3Interface.sol";
import {FixedPoint} from "../libs/FixedPoint.sol";
import {IWrappedKreskoAsset} from "../krAsset/IWrappedKreskoAsset.sol";

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

library Constants {
    uint256 constant ONE_HUNDRED_PERCENT = 1e18;

    /// @dev The maximum configurable close fee.
    uint256 constant MAX_CLOSE_FEE = 5e16; // 10%

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
}

/* -------------------------------------------------------------------------- */
/*                                    ENUM                                    */
/* -------------------------------------------------------------------------- */

/**
 * @dev Protocol user facing actions
 *
 * Deposit = 0
 * Withdraw = 1,
 * Repay = 2,
 * Borrow = 3,
 * Liquidate = 4
 */
enum Action {
    Deposit,
    Withdraw,
    Repay,
    Borrow,
    Liquidation
}

/* ========================================================================== */
/*                                   STRUCTS                                  */
/* ========================================================================== */

/**
 * @notice Initialization arguments for the protocol
 */
struct MinterInitArgs {
    address operator;
    address council;
    address feeRecipient;
    uint256 liquidationIncentiveMultiplier;
    uint256 minimumCollateralizationRatio;
    uint256 minimumDebtValue;
    uint256 liquidationThreshold;
}

/**
 * @notice Configurable parameters within the protocol
 */

struct MinterParams {
    FixedPoint.Unsigned minimumCollateralizationRatio;
    FixedPoint.Unsigned liquidationIncentiveMultiplier;
    FixedPoint.Unsigned minimumDebtValue;
    FixedPoint.Unsigned liquidationThreshold;
    address feeRecipient;
}

/**
 * @notice Information on a token that is a Kresko asset.
 * @dev Each Kresko asset has 18 decimals.
 * @param kFactor The k-factor used for calculating the required collateral value for Kresko asset debt.
 * @param oracle The oracle that provides the USD price of one Kresko asset.
 * @param supplyLimit The total supply limit of the Kresko asset.
 * @param closeFee The percentage paid in fees when closing a debt position of this type.
 * @param exists Whether the Kresko asset exists within the protocol.
 * @param mintable Whether the Kresko asset can be minted.
 */
struct KrAsset {
    FixedPoint.Unsigned kFactor;
    AggregatorV2V3Interface oracle;
    uint256 supplyLimit;
    FixedPoint.Unsigned closeFee;
    bool mintable;
    bool exists;
}

/**
 * @notice Information on a token that can be used as collateral.
 * @dev Setting the factor to zero effectively makes the asset useless as collateral while still allowing
 * it to be deposited and withdrawn.
 * @param factor The collateral factor used for calculating the value of the collateral.
 * @param oracle The oracle that provides the USD price of one collateral asset.
 * @param kreskoAsset If the collateral is a krAsset, the underlying token address
 * @param decimals The decimals for the token, stored here to avoid repetitive external calls.
 * @param exists Whether the collateral asset exists within the protocol.
 */
struct CollateralAsset {
    FixedPoint.Unsigned factor;
    AggregatorV2V3Interface oracle;
    address kreskoAsset;
    uint8 decimals;
    bool exists;
}

/// @notice Configuration for pausing `Action`
struct Pause {
    bool enabled;
    uint256 timestamp0;
    uint256 timestamp1;
}

/// @notice Safety configuration for assets
struct SafetyState {
    Pause pause;
}
