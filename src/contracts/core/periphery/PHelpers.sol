// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;

import {Asset, RawPrice} from "common/Types.sol";
import {toWad} from "common/funcs/Math.sol";
import {pushPrice} from "common/funcs/Prices.sol";
import {Enums} from "common/Constants.sol";
import {MinterState} from "minter/MState.sol";
import {cs} from "common/State.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {WadRay} from "libs/WadRay.sol";

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
    function debtAmountToValuePushPriced(
        Asset storage self,
        uint256 _amount,
        bool _ignoreKFactor
    ) internal view returns (uint256 value) {
        if (_amount == 0) return 0;
        value = krAssetUSDPushPriced(self, _amount);

        if (!_ignoreKFactor) {
            value = value.percentMul(self.kFactor);
        }
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function krAssetUSDPushPriced(Asset storage self, uint256 _amount) internal view returns (uint256) {
        return getNormalizedPushPrice(self).wadMul(_amount);
    }

    /// @notice Helper function to get unadjusted, adjusted and price values for collateral assets
    function collateralAmountToValuesPushPriced(
        Asset storage self,
        uint256 _amount
    ) internal view returns (uint256 value, uint256 valueAdjusted, uint256 price) {
        price = getNormalizedPushPrice(self);
        value = toWad(_amount, self.decimals).wadMul(price);
        valueAdjusted = value.percentMul(self.factor);
    }

    /**
     * @notice Gets the collateral value for `_amount` and returns the price used.
     * @param _amount Amount of asset
     * @param _ignoreFactor Should collateral factor be ignored.
     * @return value Value for `_amount` of the asset.
     * @return assetPrice Price of the collateral asset.
     */
    function collateralAmountToValueWithPushPrice(
        Asset storage self,
        uint256 _amount,
        bool _ignoreFactor
    ) internal view returns (uint256 value, uint256 assetPrice) {
        assetPrice = getNormalizedPushPrice(self);
        if (_amount == 0) return (0, assetPrice);
        value = toWad(_amount, self.decimals).wadMul(assetPrice);

        if (!_ignoreFactor) {
            value = value.percentMul(self.factor);
        }
    }

    /**
     * @notice Gets the collateral value for a single collateral asset and amount.
     * @param _amount Amount of asset to get the value for.
     * @param _ignoreFactor Should collateral factor be ignored.
     * @return value  Value for `_amount` of the asset.
     */
    function collateralAmountToValuePushPriced(
        Asset storage self,
        uint256 _amount,
        bool _ignoreFactor
    ) internal view returns (uint256 value) {
        if (_amount == 0) return 0;
        value = toWad(_amount, self.decimals).wadMul(getNormalizedPushPrice(self));

        if (!_ignoreFactor) {
            value = value.percentMul(self.factor);
        }
    }

    /// @notice Helper function to get unadjusted, adjusted and price values for debt assets
    function debtAmountToValuesPushPriced(
        Asset storage self,
        uint256 _amount
    ) internal view returns (uint256 value, uint256 valueAdjusted, uint256 price) {
        price = getNormalizedPushPrice(self);
        value = _amount.wadMul(price);
        valueAdjusted = value.percentMul(self.kFactor);
    }

    function getNormalizedPushPrice(Asset storage self) internal view returns (uint256 price) {
        RawPrice memory rawPrice = pushPrice(self.oracles, self.ticker);
        price = uint256(rawPrice.answer);
        if (rawPrice.oracle == Enums.OracleType.Vault || rawPrice.oracle == Enums.OracleType.API3) {
            price = price / 1e10;
        }
    }

    /**
     * @notice Gets the total debt value in USD for an account.
     * @param _account Account to calculate the KreskoAsset value for.
     * @return value Total kresko asset debt value of `_account`.
     */
    function accountTotalDebtValuePushPriced(MinterState storage self, address _account) internal view returns (uint256 value) {
        address[] memory assets = self.mintedKreskoAssets[_account];
        for (uint256 i; i < assets.length; ) {
            Asset storage asset = cs().assets[assets[i]];
            uint256 debtAmount = self.accountDebtAmount(_account, assets[i], asset);
            unchecked {
                if (debtAmount != 0) {
                    value += debtAmountToValuePushPriced(asset, debtAmount, false);
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
    function accountTotalCollateralValuePushPriced(
        MinterState storage self,
        address _account
    ) internal view returns (uint256 totalCollateralValue) {
        address[] memory assets = self.depositedCollateralAssets[_account];
        for (uint256 i; i < assets.length; ) {
            Asset storage asset = cs().assets[assets[i]];
            uint256 collateralAmount = self.accountCollateralAmount(_account, assets[i], asset);
            unchecked {
                if (collateralAmount != 0) {
                    totalCollateralValue += collateralAmountToValuePushPriced(
                        asset,
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
