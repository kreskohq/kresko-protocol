// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;
import {LibStabilityRate} from "./libs/LibStabilityRate.sol";

using LibStabilityRate for SRateAsset global;

struct SRateAsset {
    // Interest index for debt
    uint128 debtIndex;
    // Represents the optimal price rate between an oracle report and an AMM twap
    uint128 optimalPriceRate;
    // Slope of the variable interest curve when rate > 0 and <= optimalPriceRate.
    // Expressed in ray
    uint128 rateSlope1;
    // Slope of the variable interest curve when rate > optimalPriceRate.
    // Expressed in ray
    uint128 rateSlope2;
    /**
     * Represents the excess price premium in either direction.
     * Expressed in ray
     * Eg. 1/20 ray = 5% price premium in either direction is considered excess
     **/
    uint128 excessPriceRateDelta;
    // Current accrual rate for debt
    uint128 debtRate;
    // Base accrual rate for debt
    uint128 debtRateBase;
    // Interest index for debt supply - not used yet
    uint128 liquidityIndex;
    // Rate for debt supply - not used yet
    uint128 liquidityRate;
    uint128 reserveFactor;
    address asset;
    uint40 lastUpdateTimestamp;
}

struct URateAsset {
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
    address asset;
    uint40 lastUpdateTimestamp;
}

/**
* @dev UserState - additionalData is a flexible field.
* ATokens and VariableDebtTokens use this field store the index of the
* user's last supply/withdrawal/borrow/repayment. StableDebtTokens use
* this field to store the user's stable rate.
*/
struct UserState {
    uint128 balance;
    uint128 additionalData;
}

struct InterestRateState {
    mapping(address => mapping(address => UserState)) userState;
    mapping(address => SRateAsset) srAssets;
    mapping(address => SRateAsset) urAssets;
}

// Storage position
bytes32 constant INTEREST_RATE_STORAGE_POSITION = keccak256("kresko.interest.rate.storage");

// solhint-disable func-visibility
function irs() pure returns (InterestRateState storage state) {
    bytes32 position = INTEREST_RATE_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}
