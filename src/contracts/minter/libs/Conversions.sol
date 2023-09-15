// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;
import {KrAsset, CollateralAsset} from "common/libs/Assets.sol";
import {toWad} from "common/funcs/Conversions.sol";
import {ms} from "minter/libs/LibMinter.sol";
import {WadRay} from "common/libs/WadRay.sol";

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
 * @return uint256 The collateral value for the provided amount of the collateral asset.
 * @return uint256 The current price of the collateral asset.
 */
function collateralAmountToValue(
    address _collateralAsset,
    uint256 _amount,
    bool _ignoreCollateralFactor
) view returns (uint256, uint256) {
    CollateralAsset memory asset = ms().collateralAssets[_collateralAsset];

    uint256 oraclePrice = asset.uintPrice(ms().oracleDeviationPct);
    uint256 value = toWad(asset.decimals, _amount).wadMul(oraclePrice);

    if (!_ignoreCollateralFactor) {
        value = value.wadMul(asset.factor);
    }
    return (value, oraclePrice);
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
