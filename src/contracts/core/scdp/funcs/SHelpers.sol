// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.21;

import {PercentageMath} from "libs/PercentageMath.sol";
import {WadRay} from "libs/WadRay.sol";
import {Asset} from "common/Types.sol";
import {collateralAmountToValues, debtAmountToValues} from "common/funcs/Helpers.sol";
import {cs} from "common/State.sol";
import {scdp} from "scdp/SState.sol";

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */
using WadRay for uint256;
using PercentageMath for uint256;

/**
 * @notice Calculates the total collateral value of collateral assets in the pool.
 * @return value in USD
 * @return valueAdjusted Value adjusted by cFactors in USD
 */
function totalCollateralValuesSCDP() view returns (uint256 value, uint256 valueAdjusted) {
    address[] memory assets = scdp().collaterals;
    for (uint256 i; i < assets.length; ) {
        Asset storage asset = cs().assets[assets[i]];
        uint256 depositAmount = scdp().totalDepositAmount(assets[i], asset);
        if (depositAmount != 0) {
            (uint256 assetValue, uint256 assetValueAdjusted, ) = collateralAmountToValues(asset, depositAmount);
            value += assetValue;
            valueAdjusted += assetValueAdjusted;
        }

        unchecked {
            i++;
        }
    }
}

/**
 * @notice Returns the values of the krAsset held in the pool at a ratio.
 * @param _ratio ratio
 * @return value in USD
 * @return valueAdjusted Value adjusted by kFactors in USD
 */
function totalDebtValuesAtRatioSCDP(uint32 _ratio) view returns (uint256 value, uint256 valueAdjusted) {
    address[] memory assets = scdp().krAssets;
    for (uint256 i; i < assets.length; ) {
        Asset storage asset = cs().assets[assets[i]];
        uint256 debtAmount = asset.toRebasingAmount(scdp().assetData[assets[i]].debt);
        unchecked {
            if (debtAmount != 0) {
                (uint256 valueUnadjusted, uint256 adjusted, ) = debtAmountToValues(asset, debtAmount);
                value += valueUnadjusted;
                valueAdjusted += adjusted;
            }
            i++;
        }
    }

    if (_ratio != 1e4) {
        value = value.percentMul(_ratio);
        valueAdjusted = valueAdjusted.percentMul(_ratio);
    }
}
