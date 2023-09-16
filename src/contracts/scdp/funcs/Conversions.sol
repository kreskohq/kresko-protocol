// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {SafeERC20} from "vendor/SafeERC20.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";

import {krAssetAmountToValue} from "minter/funcs/Conversions.sol";
import {ms} from "minter/State.sol";
import {scdp} from "scdp/State.sol";

using WadRay for uint256;
using SafeERC20 for IERC20Permit;

function valueToSDI(uint256 valueIn, uint256 sdiPrice) view returns (uint256) {
    return (valueIn * 10 ** ms().extOracleDecimals).wadDiv(sdiPrice);
}

/// @notice Preview SDI amount from krAsset amount.
function krAssetAmountToSDI(address asset, uint256 amount, bool ignoreFactors) view returns (uint256 shares) {
    return krAssetAmountToValue(asset, amount, ignoreFactors).wadDiv(scdp().SDIPrice());
}

// /// @notice Preview how many SDI are minted when minting krAssets.
// function mintAmountToSDI(address asset, uint256 mintAmount, bool ignoreFactors) view returns (uint256 shares) {
//     return krAssetAmountToValue(asset, mintAmount, ignoreFactors).wadDiv(scdp().SDIPrice());
// }
