// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;
import {LibInterestRate} from "./libs/LibInterestRate.sol";

enum InterestRateMode {
    PREMIUM,
    UTILIZATION
}
using LibInterestRate for AssetConfig global;

struct AssetConfig {
    uint128 debtIndex;
    uint128 optimalPriceRate;
    /**
     * @dev Represents the excess utilization rate above the optimal. It's always equal to
     * 1-optimal utilization rate.
     * Expressed in ray
     **/
    // Slope of the variable interest curve when rate > 0 and <= optimalPriceRate. Expressed in ray
    uint128 rateSlope1;
    // Slope of the variable interest curve when rate > optimalPriceRate. Expressed in ray
    uint128 rateSlope2;
    uint128 excessPriceRate;
    uint128 debtRate;
    uint128 debtRateBase;
    uint128 liquidityIndex;
    uint128 liquidityRate;
    uint128 reserveFactor;
    address underlyingAsset;
    uint40 lastUpdateTimestamp;
}

struct InterestRateState {
    mapping(address => AssetConfig) configs;
}

// Storage position
bytes32 constant INTEREST_RATE_STORAGE_POSITION = keccak256("kresko.interest.rate.storage");

function irs() pure returns (InterestRateState storage state) {
    bytes32 position = INTEREST_RATE_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}
