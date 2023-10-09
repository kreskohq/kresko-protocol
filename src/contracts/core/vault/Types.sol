// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {ERC20} from "vendor/ERC20.sol";
import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";

/**
 * @notice Asset struct for deposit assets in contract
 * @param token The ERC20 token
 * @param oracle AggregatorV3Interface supporting oracle for the asset
 * @param maxDeposits Max deposits allowed for the asset
 * @param depositFee Deposit fee of the asset
 * @param withdrawFee Withdraw fee of the asset
 * @param enabled Enabled status of the asset
 */
struct VaultAsset {
    ERC20 token;
    AggregatorV3Interface oracle;
    uint32 oracleTimeout;
    uint32 depositFee;
    uint32 withdrawFee;
    uint248 maxDeposits;
    bool enabled;
}
