// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";

import {krAssetAmountToValue} from "minter/funcs/Conversions.sol";
import {ms} from "minter/State.sol";
import {SDIPrice} from "common/funcs/Prices.sol";

using WadRay for uint256;
using SafeERC20Permit for IERC20Permit;

function valueToSDI(uint256 valueIn) view returns (uint256) {
    return (valueIn * 10 ** ms().extOracleDecimals).wadDiv(SDIPrice());
}

/// @notice Preview SDI amount from krAsset amount.
function krAssetAmountToSDI(address asset, uint256 amount, bool ignoreFactors) view returns (uint256 shares) {
    return krAssetAmountToValue(asset, amount, ignoreFactors).wadDiv(SDIPrice());
}
