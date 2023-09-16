// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
import {MAssets} from "minter/funcs/Assets.sol";

/* -------------------------------------------------------------------------- */
/*                                   USINGS                                   */
/* -------------------------------------------------------------------------- */

using MAssets for KrAsset global;
using MAssets for CollateralAsset global;

/* ========================================================================== */
/*                                   STRUCTS                                  */
/* ========================================================================== */

/**
 * @notice Information on a token that is a KreskoAsset.
 * @dev Each KreskoAsset has 18 decimals.
 * @param kFactor The k-factor used for calculating the required collateral value for KreskoAsset debt.
 * @param oracle The oracle that provides the USD price of one KreskoAsset.
 * @param supplyLimit The total supply limit of the KreskoAsset.
 * @param anchor The anchor address
 * @param closeFee The percentage paid in fees when closing a debt position of this type.
 * @param openFee The percentage paid in fees when opening a debt position of this type.
 * @param exists Whether the KreskoAsset exists within the protocol.
 * @param redstoneId Redstone id for the asset
 */
struct KrAsset {
    uint256 kFactor;
    AggregatorV3Interface oracle;
    uint256 supplyLimit;
    address anchor;
    uint256 closeFee;
    uint256 openFee;
    bool exists;
    bytes32 redstoneId;
}

/**
 * @notice Information on a token that can be used as collateral.
 * @dev Setting the factor to zero effectively makes the asset useless as collateral while still allowing
 * it to be deposited and withdrawn.
 * @param factor The collateral factor used for calculating the value of the collateral.
 * @param oracle The oracle that provides the USD price of one collateral asset.
 * @param anchor If the collateral is a KreskoAsset, the anchor address
 * @param decimals The decimals for the token, stored here to avoid repetitive external calls.
 * @param exists Whether the collateral asset exists within the protocol.
 * @param liquidationIncentive The liquidation incentive for the asset
 * @param redstoneId Redstone id for the asset
 */
struct CollateralAsset {
    uint256 factor;
    AggregatorV3Interface oracle;
    address anchor;
    uint8 decimals;
    bool exists;
    uint256 liquidationIncentive;
    bytes32 redstoneId;
}

/**
 * @notice Initialization arguments for the protocol
 */
struct MinterInitArgs {
    address admin;
    address council;
    address treasury;
    uint8 extOracleDecimals;
    uint256 minCollateralRatio;
    uint256 minDebtValue;
    uint256 liquidationThreshold;
    uint256 oracleDeviationPct;
    address sequencerUptimeFeed;
    uint256 sequencerGracePeriodTime;
    uint256 oracleTimeout;
}

/**
 * @notice Configurable parameters within the protocol
 */

struct MinterParams {
    uint256 minCollateralRatio;
    uint256 minDebtValue;
    uint256 liquidationThreshold;
    uint256 maxLiquidationMultiplier;
    address feeRecipient;
    uint8 extOracleDecimals;
    uint256 oracleDeviationPct;
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

/**
 * @dev Fee types
 *
 * Open = 0
 * Close = 1
 */

enum Fee {
    Open,
    Close
}
