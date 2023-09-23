// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {collateralAmountToValue, krAssetAmountToValues, kreskoAssetAmount, krAssetAmountToValue, collateralAmountToValues} from "minter/funcs/Conversions.sol";

import {ISCDPStateFacet} from "scdp/interfaces/ISCDPStateFacet.sol";
import {SCDPCollateral, SCDPKrAsset, AssetData, UserData, GlobalData} from "scdp/Types.sol";
import {scdp, sdi} from "scdp/State.sol";

/**
 * @title SCDPStateFacet
 * @author Kresko
 * @notice  This facet is used to view the state of the scdp.
 */

contract SCDPStateFacet is ISCDPStateFacet {
    using WadRay for uint256;

    /* -------------------------------------------------------------------------- */
    /*                                  Accounts                                  */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositSCDP(address _account, address _depositAsset) external view returns (uint256) {
        return scdp().accountPrincipalDeposits(_account, _depositAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositWithFeesSCDP(address _account, address _depositAsset) external view returns (uint256) {
        return scdp().accountDepositsWithFees(_account, _depositAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositFeesGainedSCDP(address _account, address _depositAsset) external view returns (uint256) {
        return
            scdp().accountDepositsWithFees(_account, _depositAsset) - scdp().accountPrincipalDeposits(_account, _depositAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositValueSCDP(address _account, address _depositAsset) external view returns (uint256) {
        (uint256 assetValue, ) = collateralAmountToValue(
            _depositAsset,
            scdp().accountPrincipalDeposits(_account, _depositAsset),
            true
        );

        return assetValue;
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositValueWithFeesSCDP(address _account, address _depositAsset) external view returns (uint256) {
        (uint256 assetValue, ) = collateralAmountToValue(
            _depositAsset,
            scdp().accountDepositsWithFees(_account, _depositAsset),
            true
        );

        return assetValue;
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountTotalDepositsValueSCDP(address _account) external view returns (uint256) {
        return scdp().accountTotalDepositValue(_account, true);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountTotalDepositsValueWithFeesSCDP(address _account) external view returns (uint256) {
        return scdp().accountTotalDepositValueWithFees(_account);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Collaterals                                */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ISCDPStateFacet
    function getDepositAssetsSCDP() external view returns (address[] memory result) {
        address[] memory depositAssets = scdp().collaterals;
        address[] memory results = new address[](depositAssets.length);

        uint256 index;

        for (uint256 i; i < depositAssets.length; ) {
            if (scdp().isDepositEnabled[depositAssets[i]]) {
                results[index++] = depositAssets[i];
            }
            unchecked {
                i++;
            }
        }

        result = new address[](index);
        for (uint256 i; i < index; ) {
            result[i] = results[i];
            unchecked {
                i++;
            }
        }
    }

    function getCollateralsSCDP() external view returns (address[] memory result) {
        return scdp().collaterals;
    }

    /// @inheritdoc ISCDPStateFacet
    function getCollateralSCDP(address _collateralAsset) external view returns (SCDPCollateral memory) {
        return scdp().collateral[_collateralAsset];
    }

    /// @inheritdoc ISCDPStateFacet
    function getDepositsSCDP(address _depositAsset) external view returns (uint256) {
        return scdp().totalDepositAmount(_depositAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getSwapDepositsSCDP(address _collateralAsset) external view returns (uint256) {
        return scdp().swapDepositAmount(_collateralAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getCollateralValueSCDP(address _depositAsset, bool _ignoreFactors) external view returns (uint256) {
        (uint256 assetValue, ) = collateralAmountToValue(
            _depositAsset,
            scdp().totalDepositAmount(_depositAsset),
            _ignoreFactors
        );

        return assetValue;
    }

    /// @inheritdoc ISCDPStateFacet
    function getTotalCollateralValueSCDP(bool _ignoreFactors) external view returns (uint256) {
        return scdp().totalCollateralValueSCDP(_ignoreFactors);
    }

    /* -------------------------------------------------------------------------- */
    /*                                KreskoAssets                                */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ISCDPStateFacet
    function getKreskoAssetSCDP(address _krAsset) external view returns (SCDPKrAsset memory) {
        return scdp().krAsset[_krAsset];
    }

    /// @inheritdoc ISCDPStateFacet
    function getKreskoAssetsSCDP() external view returns (address[] memory) {
        return scdp().krAssets;
    }

    /// @inheritdoc ISCDPStateFacet
    function getDebtSCDP(address _kreskoAsset) external view returns (uint256) {
        return kreskoAssetAmount(_kreskoAsset, scdp().debt[_kreskoAsset]);
    }

    /// @inheritdoc ISCDPStateFacet
    function getDebtValueSCDP(address _kreskoAsset, bool _ignoreFactors) external view returns (uint256) {
        return krAssetAmountToValue(_kreskoAsset, kreskoAssetAmount(_kreskoAsset, scdp().debt[_kreskoAsset]), _ignoreFactors);
    }

    /// @inheritdoc ISCDPStateFacet
    function getTotalDebtValueSCDP(bool _ignoreFactors) external view returns (uint256) {
        return scdp().totalDebtValueAtRatioSCDP(1 ether, _ignoreFactors);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    MISC                                    */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ISCDPStateFacet
    function getFeeRecipientSCDP() external view returns (address) {
        return scdp().swapFeeRecipient;
    }

    /// @inheritdoc ISCDPStateFacet
    function getAssetEnabledSCDP(address _asset) external view returns (bool) {
        return scdp().isEnabled[_asset];
    }

    function getDepositEnabledSCDP(address _asset) external view returns (bool) {
        return scdp().isDepositEnabled[_asset];
    }

    /// @inheritdoc ISCDPStateFacet
    function getSwapEnabledSCDP(address _assetIn, address _assetOut) external view returns (bool) {
        return scdp().isSwapEnabled[_assetIn][_assetOut];
    }

    function getCollateralRatioSCDP() public view returns (uint256) {
        uint256 collateralValue = scdp().totalCollateralValueSCDP(false);
        uint256 debtValue = sdi().effectiveDebtValue();
        if (debtValue == 0) return 0;
        return collateralValue.wadDiv(debtValue);
    }

    /// @inheritdoc ISCDPStateFacet
    function getStatisticsSCDP() external view returns (GlobalData memory) {
        (uint256 debtValue, uint256 debtValueAdjusted) = scdp().totalDebtValuesAtRatioSCDP(1 ether);
        uint256 effectiveDebtValue = sdi().effectiveDebtValue();
        (uint256 collateralValue, uint256 collateralValueAdjusted) = scdp().totalCollateralValuesSCDP();
        return
            GlobalData({
                collateralValue: collateralValue,
                collateralValueAdjusted: collateralValueAdjusted,
                debtValue: debtValue,
                debtValueAdjusted: debtValueAdjusted,
                effectiveDebtValue: effectiveDebtValue,
                cr: debtValue == 0 ? 0 : collateralValue.wadDiv(effectiveDebtValue),
                crDebtValue: debtValue == 0 ? 0 : collateralValue.wadDiv(debtValue),
                crDebtValueAdjusted: debtValueAdjusted == 0 ? 0 : collateralValueAdjusted.wadDiv(debtValueAdjusted)
            });
    }

    function getAccountInfoSCDP(address _account, address[] memory _assets) public view returns (UserData memory result) {
        result.account = _account;
        (result.totalDepositValue, result.totalDepositValueWithFees, result.deposits) = scdp().accountTotalDepositValues(
            _account,
            _assets
        );
        result.totalFeesValue = result.totalDepositValueWithFees - result.totalDepositValue;
    }

    function getAccountInfosSCDP(
        address[] memory _accounts,
        address[] memory _assets
    ) external view returns (UserData[] memory result) {
        result = new UserData[](_accounts.length);

        for (uint256 i; i < _accounts.length; ) {
            address account = _accounts[i];
            result[i] = getAccountInfoSCDP(account, _assets);
            unchecked {
                i++;
            }
        }
    }

    function getAssetInfoSCDP(address _asset) public view returns (AssetData memory results) {
        bool isKrAsset = scdp().krAsset[_asset].supplyLimit != 0;
        bool isCollateral = scdp().totalDeposits[_asset] != 0;
        uint256 depositAmount = isCollateral ? scdp().totalDepositAmount(_asset) : 0;
        uint256 debtAmount = isKrAsset ? kreskoAssetAmount(_asset, scdp().debt[_asset]) : 0;

        (uint256 debtValue, uint256 debtValueAdjusted, uint256 krAssetPrice) = isKrAsset
            ? krAssetAmountToValues(_asset, debtAmount)
            : (0, 0, 0);

        (uint256 depositValue, uint256 depositValueAdjusted, uint256 collateralPrice) = isCollateral
            ? collateralAmountToValues(_asset, depositAmount)
            : (0, 0, 0);
        return
            AssetData({
                asset: _asset,
                assetPrice: krAssetPrice > 0 ? krAssetPrice : collateralPrice,
                depositAmount: depositAmount,
                depositValue: depositValue,
                depositValueAdjusted: depositValueAdjusted,
                debtAmount: debtAmount,
                debtValue: debtValue,
                debtValueAdjusted: debtValueAdjusted,
                swapDeposits: isCollateral ? scdp().swapDepositAmount(_asset) : 0,
                krAsset: scdp().krAsset[_asset], // just get default values anyway
                collateralAsset: scdp().collateral[_asset],
                symbol: IERC20Permit(_asset).symbol()
            });
    }

    function getAssetInfosSCDP(address[] memory _assets) external view returns (AssetData[] memory results) {
        // address[] memory collateralAssets = scdp().collaterals;
        results = new AssetData[](_assets.length);

        for (uint256 i; i < _assets.length; ) {
            address asset = _assets[i];
            results[i] = getAssetInfoSCDP(asset);
            unchecked {
                i++;
            }
        }
    }
}
