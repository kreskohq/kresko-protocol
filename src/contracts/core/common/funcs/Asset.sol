// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";
import {WadRay} from "libs/WadRay.sol";
import {CError} from "common/CError.sol";
import {Redstone} from "libs/Redstone.sol";
import {Asset, PushPrice} from "common/Types.sol";
import {toWad} from "common/funcs/Math.sol";
import {safePrice, pushPrice, oraclePriceToWad, SDIPrice} from "common/funcs/Prices.sol";
import {cs} from "common/State.sol";
import {PercentageMath} from "libs/PercentageMath.sol";

library CAsset {
    using WadRay for uint256;
    using PercentageMath for uint256;

    /* -------------------------------------------------------------------------- */
    /*                                Asset Prices                                */
    /* -------------------------------------------------------------------------- */

    function price(Asset storage self) internal view returns (uint256) {
        return safePrice(self.underlyingId, self.oracles, cs().oracleDeviationPct);
    }

    function price(Asset storage self, uint256 oracleDeviationPct) internal view returns (uint256) {
        return safePrice(self.underlyingId, self.oracles, oracleDeviationPct);
    }

    function pushedPrice(Asset storage self) internal view returns (PushPrice memory) {
        return pushPrice(self.oracles, self.underlyingId);
    }

    function checkOracles(Asset memory self) internal view returns (PushPrice memory) {
        return pushPrice(self.oracles, self.underlyingId);
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function uintUSD(Asset storage self, uint256 _amount) internal view returns (uint256) {
        return self.price().wadMul(_amount);
    }

    /**
     * @notice Get the oracle price of an asset in uint256 with 18 decimals
     */
    function wadPrice(Asset storage self) private view returns (uint256) {
        return oraclePriceToWad(self.price(), cs().oracleDecimals);
    }

    /**
     * @notice Get the oracle price of an asset in uint256 with oracleDecimals
     */
    function redstonePrice(Asset storage self) internal view returns (uint256) {
        return Redstone.getPrice(self.underlyingId);
    }

    function marketStatus(Asset storage self) internal view returns (bool) {
        string memory assetTicker = string(abi.encodePacked(self.underlyingId));
        bytes32 marketStatusTickerId = bytes32(abi.encodePacked("IS_MARKET_", assetTicker, "_OPEN"));
        return Redstone.getPrice(marketStatusTickerId) == 0 ? false : true;
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Conversions                                */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Ensure repayment value (and amount), clamp to max if necessary.
     * @param _maxRepayValue The max liquidatable USD (uint256).
     * @param _repayAmount The repay amount (uint256).
     * @return repayValue Effective repayment value.
     * @return repayAmount Effective repayment amount.
     */
    function ensureRepayValue(
        Asset storage self,
        uint256 _maxRepayValue,
        uint256 _repayAmount
    ) internal view returns (uint256 repayValue, uint256 repayAmount) {
        uint256 assetPrice = self.price();
        repayValue = _repayAmount.wadMul(assetPrice);

        if (repayValue > _maxRepayValue) {
            _repayAmount = _maxRepayValue.wadDiv(assetPrice);
            repayValue = _maxRepayValue;
        }
        return (repayValue, _repayAmount);
    }

    /**
     * @notice Gets the collateral value for a single collateral asset and amount.
     * @param _amount Amount of asset to get the value for.
     * @param _ignoreFactor Should collateral factor be ignored.
     * @return value  Value for `_amount` of the asset.
     */
    function collateralAmountToValue(
        Asset storage self,
        uint256 _amount,
        bool _ignoreFactor
    ) internal view returns (uint256 value) {
        if (_amount == 0) return 0;
        value = toWad(self.decimals, _amount).wadMul(self.price());

        if (!_ignoreFactor) {
            value = value.percentMul(self.factor);
        }
    }

    /**
     * @notice Gets the collateral value for `_amount` and returns the price used.
     * @param _amount Amount of asset
     * @param _ignoreFactor Should collateral factor be ignored.
     * @return value Value for `_amount` of the asset.
     * @return assetPrice Price of the collateral asset.
     */
    function collateralAmountToValueWithPrice(
        Asset storage self,
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
     * @param _amount Amount of the Kresko asset to calculate the value for.
     * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
     * @return value Value for the provided amount of the Kresko asset.
     */
    function debtAmountToValue(Asset storage self, uint256 _amount, bool _ignoreKFactor) internal view returns (uint256 value) {
        if (_amount == 0) return 0;
        value = self.uintUSD(_amount);

        if (!_ignoreKFactor) {
            value = value.percentMul(self.kFactor);
        }
    }

    /**
     * @notice Gets the amount for a single debt asset and value.
     * @param _value Value of the asset to calculate the amount for.
     * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
     * @return amount Amount for the provided value of the Kresko asset.
     */
    function debtValueToAmount(Asset storage self, uint256 _value, bool _ignoreKFactor) internal view returns (uint256 amount) {
        if (_value == 0) return 0;

        uint256 assetPrice = self.price();
        if (!_ignoreKFactor) {
            assetPrice = assetPrice.percentMul(self.kFactor);
        }

        return _value.wadDiv(assetPrice);
    }

    /// @notice Preview SDI amount from krAsset amount.
    function debtAmountToSDI(Asset storage asset, uint256 amount, bool ignoreFactors) internal view returns (uint256 shares) {
        return asset.debtAmountToValue(amount, ignoreFactors).wadDiv(SDIPrice());
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Minter Util                                */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Check that amount does not put the user's debt position below the minimum debt value.
     * @param _asset Asset being burned.
     * @param _burnAmount Debt amount burned.
     * @param _debtAmount Debt amount before burn.
     * @return amount >= minDebtAmount
     */
    function checkDust(Asset storage _asset, uint256 _burnAmount, uint256 _debtAmount) internal view returns (uint256 amount) {
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
     * @notice Checks min debt value against some amount.
     * @param _asset The asset (Asset).
     * @param _kreskoAsset The kresko asset address.
     * @param _debtAmount The debt amount (uint256).
     */
    function checkMinDebtValue(Asset storage _asset, address _kreskoAsset, uint256 _debtAmount) internal view {
        uint256 positionValue = _asset.uintUSD(_debtAmount);
        uint256 minDebtValue = cs().minDebtValue;
        if (positionValue < minDebtValue) revert CError.MINT_VALUE_LOW(_kreskoAsset, positionValue, minDebtValue);
    }

    /**
     * @notice Get the minimum collateral value required to
     * back a Kresko asset amount at a given collateralization ratio.
     * @param _krAsset Address of the Kresko asset.
     * @param _amount Kresko Asset debt amount.
     * @param _ratio Collateralization ratio for the minimum collateral value.
     * @return minCollateralValue Minimum collateral value required for `_amount` of the Kresko Asset.
     */
    function minCollateralValueAtRatio(
        Asset storage _krAsset,
        uint256 _amount,
        uint32 _ratio
    ) internal view returns (uint256 minCollateralValue) {
        if (_amount == 0) return 0;
        // Calculate the collateral value required to back this Kresko asset amount at the given ratio
        return _krAsset.debtAmountToValue(_amount, false).percentMul(_ratio);
    }

    /* -------------------------------------------------------------------------- */
    /*                                   Rebase                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Amount of non rebasing tokens -> amount of rebasing tokens
     * @dev DO use this function when reading values storage.
     * @dev DONT use this function when writing to storage.
     * @param _unrebasedAmount Unrebased amount to convert.
     * @return maybeRebasedAmount Possibly rebased amount of asset
     */
    function toRebasingAmount(Asset storage self, uint256 _unrebasedAmount) internal view returns (uint256 maybeRebasedAmount) {
        if (_unrebasedAmount == 0) return 0;
        if (self.anchor != address(0)) {
            return IKreskoAssetAnchor(self.anchor).convertToAssets(_unrebasedAmount);
        }
        return _unrebasedAmount;
    }

    /**
     * @notice Amount of rebasing tokens -> amount of non rebasing tokens
     * @dev DONT use this function when reading from storage.
     * @dev DO use this function when writing to storage.
     * @param _maybeRebasedAmount Possibly rebased amount of asset.
     * @return maybeUnrebasedAmount Possibly unrebased amount of asset
     */
    function toNonRebasingAmount(
        Asset storage self,
        uint256 _maybeRebasedAmount
    ) internal view returns (uint256 maybeUnrebasedAmount) {
        if (_maybeRebasedAmount == 0) return 0;
        if (self.anchor != address(0)) {
            return IKreskoAssetAnchor(self.anchor).convertToShares(_maybeRebasedAmount);
        }
        return _maybeRebasedAmount;
    }
}