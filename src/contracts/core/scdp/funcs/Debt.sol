// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {kreskoAssetAmount, krAssetAmountToValue, krAssetAmountToValues} from "minter/funcs/Conversions.sol";
import {SCDPState} from "scdp/State.sol";

library SDebt {
    using WadRay for uint256;

    /* -------------------------------------------------------------------------- */
    /*                                    Views                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Returns the value of the krAsset held in the pool at a ratio.
     * @param _ratio ratio
     * @param _ignorekFactor ignore kFactor
     * @return value in USD
     */
    function totalDebtValueAtRatioSCDP(
        SCDPState storage self,
        uint256 _ratio,
        bool _ignorekFactor
    ) internal view returns (uint256 value) {
        address[] memory assets = self.krAssets;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            value += krAssetAmountToValue(asset, kreskoAssetAmount(asset, self.debt[asset]), _ignorekFactor);
            unchecked {
                i++;
            }
        }

        // We dont need to multiply this.
        if (_ratio == 1 ether) {
            return value;
        }

        return value.wadMul(_ratio);
    }

    /**
     * @notice Returns the values of the krAsset held in the pool at a ratio.
     * @param _ratio ratio
     * @return value in USD
     * @return valueAdjusted Value adjusted by kFactors in USD
     */
    function totalDebtValuesAtRatioSCDP(
        SCDPState storage self,
        uint256 _ratio
    ) internal view returns (uint256 value, uint256 valueAdjusted) {
        address[] memory assets = self.krAssets;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 valueUnadjusted, uint256 adjusted, ) = krAssetAmountToValues(
                asset,
                kreskoAssetAmount(asset, self.debt[asset])
            );
            value += valueUnadjusted;
            valueAdjusted += adjusted;
            unchecked {
                i++;
            }
        }

        if (_ratio != 1 ether) {
            value = value.wadMul(_ratio);
            valueAdjusted = valueAdjusted.wadMul(_ratio);
        }
    }
}
