// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import {AggregatorV2V3Interface} from "../../vendor/flux/interfaces/AggregatorV2V3Interface.sol";
import "../../shared/FP.sol" as FixedPoint;

/* ========================================================================== */
/*                                   STRUCTS                                  */
/* ========================================================================== */

struct MinterInitArgs {
    address operator;
    address council;
    uint256 burnFee;
    address feeRecipient;
    uint256 liquidationIncentiveMultiplier;
    uint256 minimumCollateralizationRatio;
    uint256 minimumDebtValue;
    uint256 secondsUntilStalePrice;
}

struct MinterParams {
    FixedPoint.Unsigned burnfee;
    FixedPoint.Unsigned minimumCollateralizationRatio;
    FixedPoint.Unsigned liquidationIncentiveMultiplier;
    FixedPoint.Unsigned minimumDebtValue;
    uint256 secondsUntilStalePrice;
    address feeRecipient;
}

/**
 * @notice Information on a token that can be used as collateral.
 * @dev Setting the factor to zero effectively makes the asset useless as collateral while still allowing
 * it to be deposited and withdrawn.
 * @param factor The collateral factor used for calculating the value of the collateral.
 * @param oracle The oracle that provides the USD price of one collateral asset.
 * @param underlyingRebasingToken If the collateral asset is an instance of NonRebasingWrapperToken,
 * this is set to the underlying token that rebases. Otherwise, this is the zero address.
 * Added so that Kresko.sol can handle NonRebasingWrapperTokens with fewer transactions.
 * @param decimals The decimals for the token, stored here to avoid repetitive external calls.
 * @param exists Whether the collateral asset exists within the protocol.
 */
struct CollateralAsset {
    FixedPoint.Unsigned factor;
    AggregatorV2V3Interface oracle;
    address underlyingRebasingToken;
    uint8 decimals;
    bool exists;
}

/**
 * @notice Information on a token that is a Kresko asset.
 * @dev Each Kresko asset has 18 decimals.
 * @param kFactor The k-factor used for calculating the required collateral value for Kresko asset debt.
 * @param oracle The oracle that provides the USD price of one Kresko asset.
 * @param exists Whether the Kresko asset exists within the protocol.
 * @param mintable Whether the Kresko asset can be minted.
 * @param marketCapUSDLimit The market capitalization limit in USD of the Kresko asset.
 */
struct KrAsset {
    FixedPoint.Unsigned kFactor;
    AggregatorV2V3Interface oracle;
    uint256 marketCapUSDLimit;
    bool mintable;
    bool exists;
}

/* -------------------------------------------------------------------------- */
/*                               Safety Council                               */
/* -------------------------------------------------------------------------- */

/// @notice Configuration for pausing `Action`
struct Pause {
    bool enabled;
    uint256 timestamp0;
    uint256 timestamp1;
}

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

/// @notice Safety configuration for assets
struct SafetyState {
    Pause pause;
}
