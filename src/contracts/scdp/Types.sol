// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
/**
 * @notice SCDP initializer configuration.
 * @param _swapFeeRecipient The swap fee recipient.
 * @param _mcr The minimum collateralization ratio.
 * @param _lt The liquidation threshold.
 */
struct SCDPInitArgs {
    address swapFeeRecipient;
    uint256 mcr;
    uint256 lt;
}

struct SCDPCollateral {
    uint128 liquidityIndex;
    uint256 depositLimit;
    uint8 decimals;
}

struct SCDPKrAsset {
    uint256 liquidationIncentive;
    uint256 protocolFee; // Taken from the open+close fee. Goes to protocol.
    uint256 openFee;
    uint256 closeFee;
    uint256 supplyLimit;
}

// Used for setting swap pairs enabled or disabled in the pool.
struct PairSetter {
    address assetIn;
    address assetOut;
    bool enabled;
}

/**
 * @notice Asset struct for cover assets
 * @param oracle AggregatorV3Interface supporting oracle for the asset
 * @param enabled Enabled status of the asset
 */

struct CoverAsset {
    AggregatorV3Interface oracle;
    bytes32 redstoneId;
    bool enabled;
    uint8 decimals;
}

/**
 * Periphery asset data
 */
struct AssetData {
    address asset;
    uint256 depositAmount;
    uint256 debtAmount;
    uint256 swapDeposits;
    SCDPKrAsset krAsset;
    SCDPCollateral collateralAsset;
    string symbol;
}
