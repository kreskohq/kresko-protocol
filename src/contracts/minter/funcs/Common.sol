// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {krAssetAmountToValue} from "minter/funcs/Conversions.sol";
import {ms} from "minter/State.sol";
import {CollateralAsset, KrAsset} from "minter/Types.sol";

using WadRay for uint256;

/**
 * @notice Get the state of a specific collateral asset
 * @param _asset Address of the asset.
 * @return State of assets `CollateralAsset` struct
 */
function collateralAsset(address _asset) view returns (CollateralAsset memory) {
    return ms().collateralAssets[_asset];
}

/**
 * @notice Get the state of a specific krAsset
 * @param _asset Address of the asset.
 * @return State of assets `KrAsset` struct
 */
function kreskoAsset(address _asset) view returns (KrAsset memory) {
    return ms().kreskoAssets[_asset];
}

/**
 * @notice Get the minimum collateral value required to
 * back a Kresko asset amount at a given collateralization ratio.
 * @param _krAsset The address of the Kresko asset.
 * @param _amount The Kresko Asset debt amount.
 * @param _ratio The collateralization ratio required: higher ratio = more collateral required.
 * @return minCollateralValue is the minimum collateral value required for this Kresko Asset amount.
 */
function minCollateralValueAtRatio(
    address _krAsset,
    uint256 _amount,
    uint256 _ratio
) view returns (uint256 minCollateralValue) {
    // Calculate the collateral value required to back this Kresko asset amount at the given ratio
    return krAssetAmountToValue(_krAsset, _amount, false).wadMul(_ratio);
}
