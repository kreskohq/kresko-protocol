// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "../../shared/Errors.sol";
import "../../shared/Events.sol";
import "../../shared/Meta.sol";

import {MinterState, FixedPoint, CollateralAsset, KrAsset} from "./Layout.sol";
import {FPConversions} from "../../libraries/FPConversions.sol";

using FPConversions for uint8;
using FPConversions for uint256;

function initialize(MinterState storage self, address operator)  {
    self.storageVersion += 1;
    self.initialized = true;
    emit GeneralEvent.Initialized(operator, self.storageVersion);
}

/**
 * @notice Gets an account's minimum collateral value for its Kresko Asset debts.
 * @dev Accounts that have their collateral value under the minimum collateral value are considered unhealthy
 * and therefore to avoid liquidations users should maintain a collateral value higher than the value returned.
 * @param _account The account to calculate the minimum collateral value for.
 * @return The minimum collateral value of a particular account.
 */
function getAccountMinimumCollateralValue(MinterState storage self, address _account)
     view
    returns (FixedPoint.Unsigned memory)
{
    FixedPoint.Unsigned memory minCollateralValue = FixedPoint.Unsigned(0);

    address[] memory assets = self.mintedKreskoAssets[_account];
    for (uint256 i = 0; i < assets.length; i++) {
        address asset = assets[i];
        uint256 amount = self.kreskoAssetDebt[_account][asset];
        minCollateralValue = minCollateralValue.add(self.getMinimumCollateralValue(asset, amount));
    }

    return minCollateralValue;
}

/**
 * @notice Gets the collateral value of a particular account.
 * @dev O(# of different deposited collateral assets by account) complexity.
 * @param _account The account to calculate the collateral value for.
 * @return The collateral value of a particular account.
 */
function getAccountCollateralValue(MinterState storage self, address _account)
     view
    returns (FixedPoint.Unsigned memory)
{
    FixedPoint.Unsigned memory totalCollateralValue = FixedPoint.Unsigned(0);

    address[] memory assets = self.depositedCollateralAssets[_account];
    for (uint256 i = 0; i < assets.length; i++) {
        address asset = assets[i];
        (FixedPoint.Unsigned memory collateralValue, ) = self.getCollateralValueAndOraclePrice(
            asset,
            self.collateralDeposits[_account][asset],
            false // Take the collateral factor into consideration.
        );
        totalCollateralValue = totalCollateralValue.add(collateralValue);
    }

    return totalCollateralValue;
}

/**
 * @notice Get the minimum collateral value required to keep a individual debt position healthy.
 * @param _krAsset The address of the Kresko asset.
 * @param _amount The Kresko Asset debt amount.
 * @return minCollateralValue is the minimum collateral value required for this Kresko Asset amount.
 */
function getMinimumCollateralValue(
    MinterState storage self,
    address _krAsset,
    uint256 _amount
)  view returns (FixedPoint.Unsigned memory minCollateralValue) {
    // Calculate the Kresko asset's value weighted by its k-factor.
    FixedPoint.Unsigned memory weightedKreskoAssetValue = self.getKrAssetValue(_krAsset, _amount, false);
    // Calculate the minimum collateral required to back this Kresko asset amount.
    return weightedKreskoAssetValue.mul(self.minimumCollateralizationRatio);
}

/**
 * @notice Gets the collateral value for a single collateral asset and amount.
 * @param _collateralAsset The address of the collateral asset.
 * @param _amount The amount of the collateral asset to calculate the collateral value for.
 * @param _ignoreCollateralFactor Boolean indicating if the asset's collateral factor should be ignored.
 * @return The collateral value for the provided amount of the collateral asset.
 */
function getCollateralValueAndOraclePrice(
    MinterState storage self,
    address _collateralAsset,
    uint256 _amount,
    bool _ignoreCollateralFactor
)  view returns (FixedPoint.Unsigned memory, FixedPoint.Unsigned memory) {
    CollateralAsset memory collateralAsset = self.collateralAssets[_collateralAsset];

    FixedPoint.Unsigned memory fixedPointAmount = collateralAsset.decimals._toCollateralFixedPointAmount(_amount);
    FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(uint256(collateralAsset.oracle.latestAnswer()));
    FixedPoint.Unsigned memory value = fixedPointAmount.mul(oraclePrice);

    if (!_ignoreCollateralFactor) {
        value = value.mul(collateralAsset.factor);
    }
    return (value, oraclePrice);
}

/**
 * @notice Returns true if the @param _krAsset exists in the protocol
 */
function krAssetExists(MinterState storage self, address _krAsset)  view returns (bool) {
    return self.kreskoAssets[_krAsset].exists;
}

/**
 * @notice Gets an array of Kresko assets the account has minted.
 * @param _account The account to get the minted Kresko assets for.
 * @return An array of addresses of Kresko assets the account has minted.
 */
function getMintedKreskoAssets(MinterState storage self, address _account)  view returns (address[] memory) {
    return self.mintedKreskoAssets[_account];
}

/**
 * @notice Gets an index for the Kresko asset the account has minted.
 * @param _account The account to get the minted Kresko assets for.
 * @param _kreskoAsset The asset lookup address.
 * @return i = index of the minted Kresko asset.
 */
function getMintedKreskoAssetsIndex(
    MinterState storage self,
    address _account,
    address _kreskoAsset
)  view returns (uint256 i) {
    for (i; i < self.mintedKreskoAssets[_account].length; i++) {
        if (self.mintedKreskoAssets[_account][i] == _kreskoAsset) {
            break;
        }
    }
}

/**
 * @notice Gets the Kresko asset value in USD of a particular account.
 * @param _account The account to calculate the Kresko asset value for.
 * @return The Kresko asset value of a particular account.
 */
function getAccountKrAssetValue(MinterState storage self, address _account) view returns (FixedPoint.Unsigned memory) {
    FixedPoint.Unsigned memory value = FixedPoint.Unsigned(0);

    address[] memory assets = self.mintedKreskoAssets[_account];
    for (uint256 i = 0; i < assets.length; i++) {
        address asset = assets[i];
        value = value.add(self.getKrAssetValue(asset, self.kreskoAssetDebt[_account][asset], false));
    }
    return value;
}

/**
 * @notice Gets the USD value for a single Kresko asset and amount.
 * @param _kreskoAsset The address of the Kresko asset.
 * @param _amount The amount of the Kresko asset to calculate the value for.
 * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
 * @return The value for the provided amount of the Kresko asset.
 */
function getKrAssetValue(
    MinterState storage self,
    address _kreskoAsset,
    uint256 _amount,
    bool _ignoreKFactor
)  view returns (FixedPoint.Unsigned memory) {
    KrAsset memory krAsset = self.kreskoAssets[_kreskoAsset];

    FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(uint256(krAsset.oracle.latestAnswer()));

    FixedPoint.Unsigned memory value = FixedPoint.Unsigned(_amount).mul(oraclePrice);

    if (!_ignoreKFactor) {
        value = value.mul(krAsset.kFactor);
    }

    return value;
}


