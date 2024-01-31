// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;

import {Asset} from "common/Types.sol";
import {toWad} from "common/funcs/Math.sol";
import {viewPrice} from "common/funcs/Prices.sol";
import {MinterState} from "minter/MState.sol";
import {cs} from "common/State.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {WadRay} from "libs/WadRay.sol";
import {PythView} from "vendor/pyth/PythScript.sol";

using PercentageMath for uint256;
using WadRay for uint256;

library ViewHelpers {
    /* -------------------------------------------------------------------------- */
    /*                                 Push Price                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Gets the USD value for a single Kresko asset and amount.
     * @param _amount Amount of the Kresko asset to calculate the value for.
     * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
     * @return value Value for the provided amount of the Kresko asset.
     */
    function viewDebtAmountToValue(
        Asset storage self,
        uint256 _price,
        uint256 _amount,
        bool _ignoreKFactor
    ) internal view returns (uint256 value) {
        if (_amount == 0) return 0;
        value = _price.wadMul(_amount);

        if (!_ignoreKFactor) {
            value = value.percentMul(self.kFactor);
        }
    }

    /// @notice Helper function to get unadjusted, adjusted and price values for collateral assets
    function viewCollateralAmountToValues(
        Asset storage self,
        uint256 _price,
        uint256 _amount
    ) internal view returns (uint256 value, uint256 valueAdjusted) {
        value = toWad(_amount, self.decimals).wadMul(_price);
        valueAdjusted = value.percentMul(self.factor);
    }

    function viewCollateralAmountToValue(
        Asset storage self,
        uint256 _price,
        uint256 _amount,
        bool _ignoreFactor
    ) internal view returns (uint256 value) {
        if (_amount == 0) return 0;
        value = toWad(_amount, self.decimals).wadMul(_price);

        if (!_ignoreFactor) {
            value = value.percentMul(self.factor);
        }
    }

    /// @notice Helper function to get unadjusted, adjusted and price values for debt assets
    function viewDebtAmountToValues(
        Asset storage self,
        uint256 _price,
        uint256 _amount
    ) internal view returns (uint256 value, uint256 valueAdjusted) {
        value = _amount.wadMul(_price);
        valueAdjusted = value.percentMul(self.kFactor);
    }

    function getViewPrice(Asset storage self, PythView calldata prices) internal view returns (uint256 price) {
        return uint256(viewPrice(self.ticker, prices).answer);
    }

    /**
     * @notice Gets the total debt value in USD for an account.
     * @param _account Account to calculate the KreskoAsset value for.
     * @return value Total kresko asset debt value of `_account`.
     */
    function viewAccountTotalDebtValue(
        MinterState storage self,
        PythView calldata prices,
        address _account
    ) internal view returns (uint256 value) {
        address[] memory assets = self.mintedKreskoAssets[_account];
        for (uint256 i; i < assets.length; ) {
            Asset storage asset = cs().assets[assets[i]];
            uint256 debtAmount = self.accountDebtAmount(_account, assets[i], asset);
            unchecked {
                if (debtAmount != 0) {
                    value += viewDebtAmountToValue(asset, getViewPrice(asset, prices), debtAmount, false);
                }
                i++;
            }
        }
        return value;
    }

    /**
     * @notice Gets the collateral value of a particular account.
     * @param _account Account to calculate the collateral value for.
     * @return totalCollateralValue Collateral value of a particular account.
     */
    function viewAccountTotalCollateralValue(
        MinterState storage self,
        PythView calldata prices,
        address _account
    ) internal view returns (uint256 totalCollateralValue) {
        address[] memory assets = self.depositedCollateralAssets[_account];
        for (uint256 i; i < assets.length; ) {
            Asset storage asset = cs().assets[assets[i]];
            uint256 collateralAmount = self.accountCollateralAmount(_account, assets[i], asset);
            unchecked {
                if (collateralAmount != 0) {
                    totalCollateralValue += viewCollateralAmountToValue(
                        asset,
                        getViewPrice(asset, prices),
                        collateralAmount,
                        false // Take the collateral factor into consideration.
                    );
                }
                i++;
            }
        }

        return totalCollateralValue;
    }
}
