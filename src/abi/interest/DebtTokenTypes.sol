// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

enum InterestRateMode {
    AMM,
    UTILIZATION
}

struct AssetConfig {
    address underlyingAsset;
    uint128 debtIndex;
    uint128 optimalPriceRate;
    /**
     * @dev Represents the excess utilization rate above the optimal. It's always equal to
     * 1-optimal utilization rate.
     * Expressed in ray
     **/
    // Slope of the variable interest curve when utilization rate > 0 and <= optimalPriceRate. Expressed in ray
    uint128 rateSlope1;
    // Slope of the variable interest curve when utilization rate > optimalPriceRate. Expressed in ray
    uint128 rateSlope2;
    uint128 excessPriceRate;
    uint128 debtRate;
    uint128 debtRateBase;
    uint128 liquidityIndex;
    uint128 liquidityRate;
    uint40 lastUpdateTimestamp;
    uint128 reserveFactor;
}
