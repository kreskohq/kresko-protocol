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
    uint48 coverThreshold;
    uint48 coverIncentive;
}

/**
 * @notice SCDP initializer configuration.
 * @param feeAsset Asset that all fees from swaps are collected in.
 * @param minCollateralRatio The minimum collateralization ratio.
 * @param liquidationThreshold The liquidation threshold.
 * @param maxLiquidationRatio The maximum CR resulting from liquidations.
 * @param coverThreshold Threshold after which cover can be performed.
 * @param coverIncentive Incentive for covering debt instead of performing a liquidation.
 * @param sdiPricePrecision The decimal precision of SDI price.
 */
struct SCDPParameters {
    address feeAsset;
    uint32 minCollateralRatio;
    uint32 liquidationThreshold;
    uint32 maxLiquidationRatio;
    uint128 coverThreshold;
    uint128 coverIncentive;
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
    uint128 totalDeposits;
    uint128 swapDeposits;
}

/**
 * @notice SCDP asset fee and liquidation index data
 * @param currFeeIndex The ever increasing fee index, used to calculate fees.
 * @param currLiqIndex The ever increasing liquidation index, used to calculate liquidated amounts from principal.
 */
struct SCDPAssetIndexes {
    uint128 currFeeIndex;
    uint128 currLiqIndex;
}

/**
 * @notice SCDP seize data
 * @param prevLiqIndex Link to previous value in the liquidation index history.
 * @param feeIndex The fee index at the time of the seize.
 * @param liqIndex The liquidation index after the seize.
 */
struct SCDPSeizeData {
    uint256 prevLiqIndex;
    uint128 feeIndex;
    uint128 liqIndex;
}

/**
 * @notice SCDP account indexes
 * @param lastFeeIndex Fee index at the time of the action.
 * @param lastLiqIndex Liquidation index at the time of the action.
 * @param timestamp Timestamp of the action, used for external purposes.
 */
struct SCDPAccountIndexes {
    uint128 lastFeeIndex;
    uint128 lastLiqIndex;
}
