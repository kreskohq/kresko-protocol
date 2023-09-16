// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;
import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";

struct PoolCollateral {
    uint128 liquidityIndex;
    uint256 depositLimit;
    uint8 decimals;
}

struct PoolKrAsset {
    uint256 liquidationIncentive;
    uint256 protocolFee; // Taken from the open+close fee. Goes to protocol.
    uint256 openFee;
    uint256 closeFee;
    uint256 supplyLimit;
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
