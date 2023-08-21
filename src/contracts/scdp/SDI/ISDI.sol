// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
import {SafeERC20, IERC20Permit} from "common/SafeERC20.sol";
import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";

/**
 * @notice Asset struct for deposit assets in contract
 * @param token The ERC20 token
 * @param oracle AggregatorV3Interface supporting oracle for the asset
 * @param maxDeposits Max deposits allowed for the asset
 * @param depositFee Deposit fee of the asset
 * @param withdrawFee Withdraw fee of the asset
 * @param enabled Enabled status of the asset
 */
struct Asset {
    IERC20Permit token;
    AggregatorV3Interface oracle;
    uint256 maxDeposits;
    uint256 depositFee;
    uint256 withdrawFee;
    bool enabled;
}

interface ISDI {
    error InvalidPrice(address token, address oracle, int256 price);
}
