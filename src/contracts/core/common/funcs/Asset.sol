// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";
import {WadRay} from "libs/WadRay.sol";
import {Redstone} from "libs/Redstone.sol";
import {Asset, PushPrice} from "common/Types.sol";
import {toWad} from "common/funcs/Math.sol";
import {safePrice, pushPrice, oraclePriceToWad, SDIPrice} from "common/funcs/Prices.sol";
import {cs} from "common/State.sol";
import {Percentages} from "libs/Percentages.sol";

library CAsset {
    using WadRay for uint256;
    using Percentages for uint256;

    function price(Asset memory self) internal view returns (uint256) {
        return safePrice(self.id, self.oracles, cs().oracleDeviationPct);
    }

    function price(Asset memory self, uint256 oracleDeviationPct) internal view returns (uint256) {
        return safePrice(self.id, self.oracles, oracleDeviationPct);
    }

    function pushedPrice(Asset memory self) internal view returns (PushPrice memory) {
        return pushPrice(self.oracles, self.id);
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function uintUSD(Asset memory self, uint256 _amount) internal view returns (uint256) {
        return self.price().wadMul(_amount);
    }

    /**
     * @notice Get the oracle price of an asset in uint256 with 18 decimals
     */
    function wadPrice(Asset memory self) private view returns (uint256) {
        return oraclePriceToWad(self.price());
    }

    /**
     * @notice Get the oracle price of an asset in uint256 with extOracleDecimals
     */
    function redstonePrice(Asset memory self) internal view returns (uint256) {
        return Redstone.getPrice(self.id);
    }

    function marketStatus(Asset memory) internal pure returns (bool) {
        return true;
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Conversions                                */
    /* -------------------------------------------------------------------------- */
    /**
     * @notice Gets the collateral value for a single collateral asset and amount.
     * @param _amount The amount of the collateral asset to calculate the collateral value for.
     * @param _ignoreFactor Boolean indicating if the asset's collateral factor should be ignored.
     * @return value The collateral value for the provided amount of the collateral asset.
     * @return assetPrice The current price of the collateral asset.
     */
    function collateralAmountToValue(
        Asset memory self,
        uint256 _amount,
        bool _ignoreFactor
    ) internal view returns (uint256 value, uint256 assetPrice) {
        assetPrice = self.price();
        if (_amount == 0) return (0, assetPrice);
        value = toWad(self.decimals, _amount).wadMul(assetPrice);

        if (!_ignoreFactor) {
            value = value.percentMul(self.factor);
        }
    }

    /**
     * @notice Gets the USD value for a single Kresko asset and amount.
     * @param _amount The amount of the Kresko asset to calculate the value for.
     * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
     * @return The value for the provided amount of the Kresko asset.
     */
    function debtAmountToValue(Asset memory self, uint256 _amount, bool _ignoreKFactor) internal view returns (uint256) {
        if (_amount == 0) return 0;
        uint256 value = self.uintUSD(_amount);

        if (!_ignoreKFactor) {
            value = value.percentMul(self.kFactor);
        }

        return value;
    }

    /**
     * @notice Gets the amount for a single debt asset and value.
     * @param _value The value of the asset to calculate the amount for.
     * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
     * @return uint256 The amount for the provided value of the Kresko asset.
     */
    function debtValueToAmount(Asset memory self, uint256 _value, bool _ignoreKFactor) internal view returns (uint256) {
        if (_value == 0) return 0;

        uint256 currentPrice = self.price();
        if (!_ignoreKFactor) {
            currentPrice = currentPrice.percentMul(self.kFactor);
        }

        return _value.wadDiv(currentPrice);
    }

    /// @notice Preview SDI amount from krAsset amount.
    function debtAmountToSDI(Asset memory asset, uint256 amount, bool ignoreFactors) internal view returns (uint256 shares) {
        return asset.debtAmountToValue(amount, ignoreFactors).wadDiv(SDIPrice());
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Utils                                   */
    /* -------------------------------------------------------------------------- */
    /**
     * @notice Check that amount does not put the user's debt position below the minimum debt value.
     * @param _asset The asset being checked.
     * @param _burnAmount The amount being burned
     * @param _debtAmount The debt amount of `_account`
     * @return amount >= minDebtAmount
     */
    function checkDust(Asset memory _asset, uint256 _burnAmount, uint256 _debtAmount) internal view returns (uint256 amount) {
        if (_burnAmount == _debtAmount) return _burnAmount;
        // If the requested burn would put the user's debt position below the minimum
        // debt value, close up to the minimum debt value instead.
        uint256 krAssetValue = _asset.debtAmountToValue(_debtAmount - _burnAmount, true);
        uint256 minDebtValue = cs().minDebtValue;
        if (krAssetValue > 0 && krAssetValue < minDebtValue) {
            uint256 minDebtAmount = minDebtValue.wadDiv(_asset.price());
            amount = _debtAmount - minDebtAmount;
        } else {
            amount = _burnAmount;
        }
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
        Asset memory _krAsset,
        uint256 _amount,
        uint256 _ratio
    ) internal view returns (uint256 minCollateralValue) {
        if (_amount == 0) return 0;
        // Calculate the collateral value required to back this Kresko asset amount at the given ratio
        return _krAsset.debtAmountToValue(_amount, false).percentMul(_ratio);
    }

    /* -------------------------------------------------------------------------- */
    /*                                Rebase Utils                                */
    /* -------------------------------------------------------------------------- */

    function amountWrite(Asset memory self, uint256 _amount) internal view returns (uint256 possiblyUnrebasedAmount) {
        if (_amount == 0) return 0;
        return self.toNonRebasingAmount(_amount);
    }

    /**
     * @notice Get asset amount for viewing, since if the asset is a KreskoAsset, it can be rebased.
     * @param _amount The asset amount,
     * @return possiblyRebasedAmount amount of collateral for `self`
     */
    function amountRead(Asset memory self, uint256 _amount) internal view returns (uint256 possiblyRebasedAmount) {
        if (_amount == 0) return 0;
        return self.toRebasingAmount(_amount);
    }

    /**
     * @notice Amount of non rebasing tokens -> amount of rebasing tokens
     * @param self the asset struct
     * @param _nonRebasedAmount the amount to convert
     */
    function toRebasingAmount(Asset memory self, uint256 _nonRebasedAmount) internal view returns (uint256) {
        if (_nonRebasedAmount == 0) return 0;
        if (self.anchor != address(0)) {
            return IKreskoAssetAnchor(self.anchor).convertToAssets(_nonRebasedAmount);
        }
        return _nonRebasedAmount;
    }

    /**
     * @notice Amount of rebasing tokens -> amount of non rebasing tokens
     * @param self the asset struct
     * @param _maybeRebasedAmount the amount to convert
     */
    function toNonRebasingAmount(Asset memory self, uint256 _maybeRebasedAmount) internal view returns (uint256) {
        if (_maybeRebasedAmount == 0) return 0;
        if (self.anchor != address(0)) {
            return IKreskoAssetAnchor(self.anchor).convertToShares(_maybeRebasedAmount);
        }
        return _maybeRebasedAmount;
    }
}
