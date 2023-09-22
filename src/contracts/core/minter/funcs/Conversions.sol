// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {toWad} from "common/funcs/Math.sol";
import {WadRay} from "libs/WadRay.sol";

import {KrAsset, CollateralAsset} from "minter/Types.sol";
import {ms} from "minter/State.sol";

using WadRay for uint256;

/* -------------------------------------------------------------------------- */
/*                                Kresko Assets                               */
/* -------------------------------------------------------------------------- */

/**
 * @notice Gets the USD value for a single Kresko asset and amount.
 * @param _kreskoAsset The address of the Kresko asset.
 * @param _amount The amount of the Kresko asset to calculate the value for.
 * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
 * @return The value for the provided amount of the Kresko asset.
 */
function krAssetAmountToValue(address _kreskoAsset, uint256 _amount, bool _ignoreKFactor) view returns (uint256) {
    KrAsset memory krAsset = ms().kreskoAssets[_kreskoAsset];
    uint256 value = krAsset.uintUSD(_amount, ms().oracleDeviationPct);

    if (!_ignoreKFactor) {
        value = value.wadMul(krAsset.kFactor);
    }

    return value;
}

function krAssetAmountToValues(
    address _kreskoAsset,
    uint256 _amount
) view returns (uint256 value, uint256 valueAdjusted, uint256 price) {
    KrAsset memory krAsset = ms().kreskoAssets[_kreskoAsset];
    price = krAsset.price();
    value = _amount.wadMul(price);
    valueAdjusted = value.wadMul(krAsset.kFactor);
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
    uint256 price = krAsset.price();
    if (!_ignoreKFactor) {
        price = price.wadMul(krAsset.kFactor);
    }

    return _value.wadDiv(price);
}

/**
 * @notice Get possibly rebased amount of kreskoAssets. Use when saving to storage.
 * @param _asset The asset address
 * @param _amount The account to query amount for
 * @return amount Amount of principal debt for `_asset`
 */
function kreskoAssetAmount(address _asset, uint256 _amount) view returns (uint256 amount) {
    return ms().kreskoAssets[_asset].toRebasingAmount(_amount);
}

/* -------------------------------------------------------------------------- */
/*                                 Collateral                                 */
/* -------------------------------------------------------------------------- */

/**
 * @notice Gets the collateral value for a single collateral asset and amount.
 * @param _collateralAsset The address of the collateral asset.
 * @param _amount The amount of the collateral asset to calculate the collateral value for.
 * @param _ignoreCollateralFactor Boolean indicating if the asset's collateral factor should be ignored.
 * @return value The collateral value for the provided amount of the collateral asset.
 * @return price The current price of the collateral asset.
 */
function collateralAmountToValue(
    address _collateralAsset,
    uint256 _amount,
    bool _ignoreCollateralFactor
) view returns (uint256 value, uint256 price) {
    CollateralAsset memory asset = ms().collateralAssets[_collateralAsset];

    price = asset.price();
    value = toWad(asset.decimals, _amount).wadMul(price);

    if (!_ignoreCollateralFactor) {
        value = value.wadMul(asset.factor);
    }
}

function collateralAmountToValues(
    address _collateralAsset,
    uint256 _amount
) view returns (uint256 value, uint256 valueAdjusted, uint256 price) {
    CollateralAsset memory asset = ms().collateralAssets[_collateralAsset];
    price = asset.price();
    value = toWad(asset.decimals, _amount).wadMul(price);
    valueAdjusted = value.wadMul(asset.factor);
}

function collateralAmountWrite(address _asset, uint256 _amount) view returns (uint256 possiblyUnrebasedAmount) {
    return ms().collateralAssets[_asset].toNonRebasingAmount(_amount);
}

/**
 * @notice Get collateral asset amount for viewing, since if the asset is a KreskoAsset, it can be rebased.
 * @param _asset The asset address
 * @param _amount The asset amount
 * @return possiblyRebasedAmount amount of collateral for `_asset`
 */
function collateralAmountRead(address _asset, uint256 _amount) view returns (uint256 possiblyRebasedAmount) {
    return ms().collateralAssets[_asset].toRebasingAmount(_amount);
}
