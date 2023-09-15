// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;
import {WadRay} from "common/libs/WadRay.sol";
import {krAssetAmountToValue} from "minter/libs/Conversions.sol";

using WadRay for uint256;

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
