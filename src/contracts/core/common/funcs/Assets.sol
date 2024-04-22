// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";
import {WadRay} from "libs/WadRay.sol";
import {Errors} from "common/Errors.sol";
import {Constants} from "common/Constants.sol";
import {Asset} from "common/Types.sol";
import {toWad} from "common/funcs/Math.sol";
import {safePrice, SDIPrice} from "common/funcs/Prices.sol";
import {cs} from "common/State.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {ms} from "minter/MState.sol";
import {scdp} from "scdp/SState.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IKISS} from "kiss/interfaces/IKISS.sol";

library Assets {
    using WadRay for uint256;
    using PercentageMath for uint256;

    /* -------------------------------------------------------------------------- */
    /*                                Asset Prices                                */
    /* -------------------------------------------------------------------------- */

    function price(Asset storage self) internal view returns (uint256) {
        return safePrice(self.ticker, self.oracles, cs().maxPriceDeviationPct);
    }

    function price(Asset storage self, uint256 maxPriceDeviationPct) internal view returns (uint256) {
        return safePrice(self.ticker, self.oracles, maxPriceDeviationPct);
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function krAssetUSD(Asset storage self, uint256 _amount) internal view returns (uint256) {
        return self.price().wadMul(_amount);
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function assetUSD(Asset storage self, uint256 _amount) internal view returns (uint256) {
        return self.collateralAmountToValue(_amount, true);
    }

    function isMarketOpen(Asset storage) internal pure returns (bool) {
        return true;
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
    function boundRepayValue(
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
        value = toWad(_amount, self.decimals).wadMul(self.price());

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
        value = toWad(_amount, self.decimals).wadMul(assetPrice);

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
        value = self.krAssetUSD(_amount);

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
        return toWad(asset.debtAmountToValue(amount, ignoreFactors), cs().oracleDecimals).wadDiv(SDIPrice());
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
        uint256 minDebtValue = ms().minDebtValue;
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
     * @param _krAsset The kresko asset address.
     * @param _debtAmount The debt amount (uint256).
     */
    function ensureMinDebtValue(Asset storage _asset, address _krAsset, uint256 _debtAmount) internal view {
        uint256 positionValue = _asset.krAssetUSD(_debtAmount);
        uint256 minDebtValue = ms().minDebtValue;
        if (positionValue < minDebtValue)
            revert Errors.MINT_VALUE_LESS_THAN_MIN_DEBT_VALUE(Errors.id(_krAsset), positionValue, minDebtValue);
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
    /*                                    Utils                                   */
    /* -------------------------------------------------------------------------- */
    function exists(Asset storage self) internal view returns (bool) {
        return self.ticker != Constants.ZERO_BYTES32;
    }

    function isVoid(Asset storage self) internal view returns (bool) {
        return
            self.ticker != Constants.ZERO_BYTES32 &&
            !self.isMinterCollateral &&
            !self.isMinterMintable &&
            !self.isSharedCollateral &&
            !self.isSwapMintable;
    }

    /**
     * @notice EDGE CASE: If the collateral asset is also a kresko asset, ensure that the deposit amount is above the minimum.
     * @dev This is done because kresko assets can be rebased.
     */
    function ensureMinKrAssetCollateral(Asset storage self, address _self, uint256 _newCollateralAmount) internal view {
        if (_newCollateralAmount > Constants.MIN_KRASSET_COLLATERAL_AMOUNT || _newCollateralAmount == 0) return;
        if (self.anchor == address(0)) return;
        revert Errors.COLLATERAL_AMOUNT_LOW(Errors.id(_self), _newCollateralAmount, Constants.MIN_KRASSET_COLLATERAL_AMOUNT);
    }

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

    /**
     * @notice Validate that the minter debt limit is not exceeded.
     * @param _asset Asset struct of the asset being minted.
     * @param _krAsset Address of the kresko asset being minted.
     * @param _mintAmount Amount of the kresko asset being minted.
     * @dev Reverts if the minter debt limit is exceeded.
     */
    function validateMinterDebtLimit(Asset storage _asset, address _krAsset, uint256 _mintAmount) internal view {
        uint256 supply = getMinterSupply(_asset, _krAsset);
        uint256 newSupply = supply + _mintAmount;
        if (newSupply > _asset.maxDebtMinter) {
            revert Errors.EXCEEDS_ASSET_MINTING_LIMIT(Errors.id(_krAsset), newSupply, _asset.maxDebtMinter);
        }
    }

    /**
     * @notice Get the minter supply for a given kresko asset.
     * @param _asset Asset struct of the asset being minted.
     * @param _krAsset Address of the kresko asset being minted.
     * @return minterSupply Minter supply for the kresko asset.
     */
    function getMinterSupply(Asset storage _asset, address _krAsset) internal view returns (uint256) {
        if (_asset.anchor == _krAsset) {
            return _getMinterSupplyKiss(_krAsset);
        }
        return _getMinterSupplyKrAsset(_krAsset, _asset.anchor);
    }

    function _getMinterSupplyKrAsset(address _assetAddr, address _anchor) private view returns (uint256) {
        IKreskoAssetAnchor anchor = IKreskoAssetAnchor(_anchor);
        return anchor.convertToAssets(anchor.totalSupply() - anchor.balanceOf(_assetAddr) - scdp().assetData[_assetAddr].debt);
    }

    function _getMinterSupplyKiss(address _assetAddr) private view returns (uint256) {
        return
            IERC20(_assetAddr).totalSupply() -
            (IERC20(IKISS(_assetAddr).vKISS()).balanceOf(_assetAddr) + scdp().assetData[_assetAddr].debt);
    }
}
