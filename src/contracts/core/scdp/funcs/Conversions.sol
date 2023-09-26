// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {Asset} from "common/Types.sol";
import {SDIPrice} from "common/funcs/Prices.sol";
import {cs} from "common/State.sol";

using WadRay for uint256;

function valueToSDI(uint256 valueIn) view returns (uint256) {
    return (valueIn * 10 ** cs().extOracleDecimals).wadDiv(SDIPrice());
}

/// @notice Preview SDI amount from krAsset amount.
function krAssetAmountToSDI(Asset memory asset, uint256 amount, bool ignoreFactors) view returns (uint256 shares) {
    return asset.debtAmountToValue(amount, ignoreFactors).wadDiv(SDIPrice());
}
