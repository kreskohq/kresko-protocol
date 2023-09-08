// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {ms} from "minter/libs/LibMinterBig.sol";
import {scdp} from "scdp/libs/LibSCDP.sol";
import {sdi} from "scdp/libs/LibSDI.sol";
import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";
import {KrAsset, CollateralAsset} from "common/libs/Assets.sol";
import {WadRay} from "common/libs/WadRay.sol";
import {toWad} from "common/Functions.sol";
import {Rebase} from "common/libs/Rebase.sol";

// Storage position

/**
 * @title Library for combined state access and utility functions
 */

library Shared {
    using WadRay for uint256;

    function burnAssets(address _kreskoAsset, uint256 _burnAmount, address _from) internal returns (uint256 destroyed) {
        destroyed = IKreskoAssetIssuer(ms().kreskoAssets[_kreskoAsset].anchor).destroy(_burnAmount, _from);
        require(destroyed != 0, "zero-burn");
    }

    function mintAssets(address _kreskoAsset, uint256 _amount, address _to) internal returns (uint256 issued) {
        issued = IKreskoAssetIssuer(ms().kreskoAssets[_kreskoAsset].anchor).issue(_amount, _to);
        require(issued != 0, "zero-mint");
    }

    /// @notice Get the price of SDI in USD, oracle precision.
    function SDIPrice() internal view returns (uint256) {
        uint256 totalValue = getTotalPoolKrAssetValueAtRatio(1 ether, false);
        if (totalValue == 0) {
            return 10 ** ms().extOracleDecimals;
        }
        return totalValue.wadDiv(sdi().totalDebt);
    }

    function valueToSDI(uint256 valueIn) internal view returns (uint256) {
        return (valueIn * 10 ** ms().extOracleDecimals).wadDiv(SDIPrice());
    }

    /// @notice Preview how many SDI are removed when burning krAssets.
    function previewSCDPBurn(
        address asset,
        uint256 burnAmount,
        bool ignoreFactors
    ) internal view returns (uint256 shares) {
        return ms().getKrAssetUSD(asset, burnAmount, ignoreFactors).wadDiv(SDIPrice());
    }

    /// @notice Preview how many SDI are minted when minting krAssets.
    function previewSCDPMint(
        address asset,
        uint256 mintAmount,
        bool ignoreFactors
    ) internal view returns (uint256 shares) {
        return ms().getKrAssetUSD(asset, mintAmount, ignoreFactors).wadDiv(SDIPrice());
    }

    function oracleDeviationPct() internal view returns (uint256) {
        return ms().oracleDeviationPct;
    }

    /**
     * @notice Get collateral asset amount for saving, it will be unrebased if the asset is a KreskoAsset
     * @param _asset The asset address
     * @param _amount The asset amount
     * @return possiblyUnrebasedAmount The possibly unrebased amount
     */

    /**
     * @notice Gets the USD value for a single Kresko asset and amount.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _amount The amount of the Kresko asset to calculate the value for.
     * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
     * @return The value for the provided amount of the Kresko asset.
     */
    function getKrAssetValue(
        address _kreskoAsset,
        uint256 _amount,
        bool _ignoreKFactor
    ) internal view returns (uint256) {
        KrAsset memory krAsset = ms().kreskoAssets[_kreskoAsset];
        uint256 value = krAsset.uintUSD(_amount, ms().oracleDeviationPct);

        if (!_ignoreKFactor) {
            value = value.wadMul(krAsset.kFactor);
        }

        return value;
    }

    /**
     * @notice Returns the value of the krAsset held in the pool at a ratio.
     * @param _ratio ratio
     * @param _ignorekFactor ignore kFactor
     * @return value in USD
     */
    function getTotalPoolKrAssetValueAtRatio(
        uint256 _ratio,
        bool _ignorekFactor
    ) internal view returns (uint256 value) {
        address[] memory assets = scdp().krAssets;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            value += getKrAssetValue(asset, Rebase.getKreskoAssetAmount(asset, scdp().debt[asset]), _ignorekFactor);
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
     * @notice Checks whether the collateral ratio is equal to or above to ratio supplied.
     * @param _collateralRatio ratio to check
     */
    function checkSCDPRatioWithdrawal(uint256 _collateralRatio) internal view returns (bool) {
        return
            getTotalPoolDepositValue(
                false // dont ignore cFactor
            ) >= getTotalPoolKrAssetValueAtRatio(_collateralRatio, false); // dont ignore kFactors or MCR;
    }

    /**
     * @notice Checks whether the collateral ratio is equal to or above to ratio supplied.
     * @param _collateralRatio ratio to check
     */
    function checkSCDPRatio(uint256 _collateralRatio) internal view returns (bool) {
        return
            Shared.getTotalPoolDepositValue(
                false // dont ignore cFactor
            ) >= sdi().effectiveDebtUSD().wadMul(_collateralRatio);
    }

    /**
     * @notice Calculates the total collateral value of collateral assets in the pool.
     * @param _ignoreFactors whether to ignore factors
     * @return value in USD
     */
    function getTotalPoolDepositValue(bool _ignoreFactors) internal view returns (uint256 value) {
        address[] memory assets = scdp().collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, ) = ms().getCollateralValueAndPrice(
                asset,
                scdp().getPoolDeposits(asset),
                _ignoreFactors
            );
            value += assetValue;

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Returns the value of the collateral asset in the pool and the value of the amount.
     * Saves gas for getting the values in the same execution.
     * @param _collateralAsset collateral asset
     * @param _amount amount of collateral asset
     * @param _ignoreFactors whether to ignore cFactor and kFactor
     */
    function getTotalPoolDepositValue(
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreFactors
    ) internal view returns (uint256 totalValue, uint256 amountValue) {
        address[] memory assets = scdp().collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, uint256 price) = ms().getCollateralValueAndPrice(
                asset,
                scdp().getPoolDeposits(asset),
                _ignoreFactors
            );

            totalValue += assetValue;
            if (asset == _collateralAsset) {
                CollateralAsset memory collateral = ms().collateralAssets[_collateralAsset];
                amountValue = toWad(collateral.decimals, _amount).wadMul(
                    _ignoreFactors ? price : price.wadMul(collateral.factor)
                );
            }

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Returns the value of the collateral assets in the pool for `_account`.
     * @param _account account
     * @param _ignoreFactors whether to ignore cFactor and kFactor
     */
    function getAccountTotalDepositValuePrincipal(
        address _account,
        bool _ignoreFactors
    ) internal view returns (uint256 totalValue) {
        address[] memory assets = scdp().collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, ) = ms().getCollateralValueAndPrice(
                asset,
                scdp().getAccountPrincipalDeposits(_account, asset),
                _ignoreFactors
            );

            totalValue += assetValue;

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Returns the value of the collateral assets in the pool for `_account` with fees.
     * @notice Ignores all factors.
     * @param _account account
     */
    function getAccountTotalDepositValueWithFees(address _account) internal view returns (uint256 totalValue) {
        address[] memory assets = scdp().collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, ) = ms().getCollateralValueAndPrice(
                asset,
                scdp().getAccountDepositsWithFees(_account, asset),
                true
            );

            totalValue += assetValue;

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Divides an uint256 @param _value with @param _priceWithOracleDecimals
     * @param _value Left side value of the division
     * @param wadValue result with 18 decimals
     */
    function divByPrice(uint256 _value, uint256 _priceWithOracleDecimals) internal view returns (uint256 wadValue) {
        uint8 oracleDecimals = ms().extOracleDecimals;
        if (oracleDecimals >= 18) return _priceWithOracleDecimals;
        return (_value * 10 ** oracleDecimals) / _priceWithOracleDecimals;
    }

    /**
     * @notice Converts an uint256 with extOracleDecimals into a number with 18 decimals
     * @param _wadPrice value with extOracleDecimals
     */
    function fromWadPriceToUint(uint256 _wadPrice) internal view returns (uint256 priceWithOracleDecimals) {
        uint8 oracleDecimals = ms().extOracleDecimals;
        if (oracleDecimals == 18) return _wadPrice;
        return _wadPrice / 10 ** (18 - oracleDecimals);
    }
}
