// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {Asset} from "common/Types.sol";
import {cs} from "common/State.sol";
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
            Asset memory asset = cs().assets[assets[i]];
            value += asset.debtAmountToValue(asset.toRebasingAmount(self.debt[assets[i]]), _ignorekFactor);
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
            Asset memory asset = cs().assets[assets[i]];
            (uint256 valueUnadjusted, uint256 adjusted, ) = asset.debtAmountToValues(
                asset.toRebasingAmount(self.debt[assets[i]])
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
