// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;

import {Asset, RawPrice} from "common/Types.sol";
import {toWad} from "common/funcs/Math.sol";
import {pushPrice, viewPrice} from "common/funcs/Prices.sol";
import {Enums} from "common/Constants.sol";
import {MinterState} from "minter/MState.sol";
import {cs} from "common/State.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {WadRay} from "libs/WadRay.sol";
import {Result} from "vendor/pyth/PythScript.sol";

using PercentageMath for uint256;
using WadRay for uint256;

library PHelpers {
    /* -------------------------------------------------------------------------- */
    /*                                 Push Price                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Gets the USD value for a single Kresko asset and amount.
     * @param _amount Amount of the Kresko asset to calculate the value for.
     * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
     * @return value Value for the provided amount of the Kresko asset.
     */
    function debtAmountToValueView(
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
    function collateralAmountToValuesView(
        Asset storage self,
        uint256 _price,
        uint256 _amount
    ) internal view returns (uint256 value, uint256 valueAdjusted) {
        value = toWad(_amount, self.decimals).wadMul(_price);
        valueAdjusted = value.percentMul(self.factor);
    }

    function collateralAmountToValueView(
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
    function debtAmountToValuesView(
        Asset storage self,
        uint256 _price,
        uint256 _amount
    ) internal view returns (uint256 value, uint256 valueAdjusted) {
        value = _amount.wadMul(_price);
        valueAdjusted = value.percentMul(self.kFactor);
    }

    function getNormalizedPushPrice(Asset storage self) internal view returns (uint256 price) {
        RawPrice memory rawPrice = pushPrice(self.oracles, self.ticker);
        price = uint256(rawPrice.answer);
        if (rawPrice.oracle == Enums.OracleType.API3) {
            price = price / 1e10;
        }
    }

    function getViewPrice(Asset storage self, Result memory res) internal view returns (uint256 price) {
        return uint256(viewPrice(self.ticker, res).answer);
    }

    /**
     * @notice Gets the total debt value in USD for an account.
     * @param _account Account to calculate the KreskoAsset value for.
     * @return value Total kresko asset debt value of `_account`.
     */
    function accountTotalDebtValueView(
        MinterState storage self,
        Result memory res,
        address _account
    ) internal view returns (uint256 value) {
        address[] memory assets = self.mintedKreskoAssets[_account];
        for (uint256 i; i < assets.length; ) {
            Asset storage asset = cs().assets[assets[i]];
            uint256 debtAmount = self.accountDebtAmount(_account, assets[i], asset);
            unchecked {
                if (debtAmount != 0) {
                    value += debtAmountToValueView(asset, getViewPrice(asset, res), debtAmount, false);
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
    function accountTotalCollateralValueView(
        MinterState storage self,
        Result memory res,
        address _account
    ) internal view returns (uint256 totalCollateralValue) {
        address[] memory assets = self.depositedCollateralAssets[_account];
        for (uint256 i; i < assets.length; ) {
            Asset storage asset = cs().assets[assets[i]];
            uint256 collateralAmount = self.accountCollateralAmount(_account, assets[i], asset);
            unchecked {
                if (collateralAmount != 0) {
                    totalCollateralValue += collateralAmountToValueView(
                        asset,
                        getViewPrice(asset, res),
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
