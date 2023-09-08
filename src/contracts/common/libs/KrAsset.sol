// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {ms} from "minter/libs/LibMinterBig.sol";
import {KrAsset} from "./Assets.sol";
import {WadRay} from "./WadRay.sol";

using WadRay for uint256;

/**
 * @notice Gets the USD value for a single Kresko asset and amount.
 * @param _kreskoAsset The address of the Kresko asset.
 * @param _amount The amount of the Kresko asset to calculate the value for.
 * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
 * @return The value for the provided amount of the Kresko asset.
 */

function getKrAssetValue(address _kreskoAsset, uint256 _amount, bool _ignoreKFactor) view returns (uint256) {
    KrAsset memory krAsset = ms().kreskoAssets[_kreskoAsset];
    uint256 value = krAsset.uintUSD(_amount, ms().oracleDeviationPct);

    if (!_ignoreKFactor) {
        value = value.wadMul(krAsset.kFactor);
    }

    return value;
}

/**
 * @notice Gets the amount for a single Kresko asset and value.
 * @param _kreskoAsset The address of the Kresko asset.
 * @param _value The value of the Kresko asset to calculate the amount for.
 * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
 * @return uint256 The amount for the provided value of the Kresko asset.
 */

function krAssetValueToAmount(address _kreskoAsset, uint256 _value, bool _ignoreKFactor) view returns (uint256) {
    KrAsset memory krAsset = ms().kreskoAssets[_kreskoAsset];
    uint256 price = krAsset.uintPrice(ms().oracleDeviationPct);
    if (!_ignoreKFactor) {
        price = price.wadMul(krAsset.kFactor);
    }

    return _value.wadDiv(price);
}
