// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

/**
 * @notice SCDP initializer configuration.
 * @param minCollateralRatio The minimum collateralization ratio.
 * @param liquidationThreshold The liquidation threshold.
 * @param sdiPricePrecision The decimals in SDI price.
 */
struct SCDPInitArgs {
    uint32 minCollateralRatio;
    uint32 liquidationThreshold;
    uint8 sdiPricePrecision;
}

/**
 * @notice SCDP initializer configuration.
 * @param feeAsset Asset that all fees from swaps are collected in.
 * @param minCollateralRatio The minimum collateralization ratio.
 * @param liquidationThreshold The liquidation threshold.
 * @param maxLiquidationRatio The maximum CR resulting from liquidations.
 * @param sdiPricePrecision The decimal precision of SDI price.
 */
struct SCDPParameters {
    address feeAsset;
    uint32 minCollateralRatio;
    uint32 liquidationThreshold;
    uint32 maxLiquidationRatio;
    uint8 sdiPricePrecision;
}

// Used for setting swap pairs enabled or disabled in the pool.
struct SwapRouteSetter {
    address assetIn;
    address assetOut;
    bool enabled;
}

struct SCDPAssetData {
    uint256 debt;
    uint256 totalLiquidated;
    uint128 totalDeposits;
    uint128 swapDeposits;
}

struct SCDPAssetIndexes {
    uint256 currentFee;
    uint256 currentLiquidation;
    uint256 lastFeeAtSeize;
}

struct SCDPSeizeEvent {
    uint256 blocknumber;
    uint256 previousLiquidationIndex;
    uint256 feeIndex;
    uint256 liquidationIndex;
}

struct SCDPAccountIndexes {
    uint256 lastFee;
    uint256 lastLiquidation;
}

// mapping(address => uint256) liquidationIndex;
// mapping(address => uint256) liquidityIndexAtLastSeize;
// mapping(address => mapping(address => uint256)) lastLiquidityIndex;
// mapping(address => mapping(address => uint256)) lastLiquidationIndex;
