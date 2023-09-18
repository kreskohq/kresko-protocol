// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {collateralAmountToValue, kreskoAssetAmount, krAssetAmountToValue, collateralAmountRead} from "minter/funcs/Conversions.sol";

import {ISCDPStateFacet} from "scdp/interfaces/ISCDPStateFacet.sol";
import {SCDPCollateral, SCDPKrAsset, AssetData} from "scdp/Types.sol";
import {scdp} from "scdp/State.sol";

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
    function getAccountDepositsWithFeesSCDP(address _account, address _depositAsset) external view returns (uint256) {
        return scdp().accountDepositsWithFees(_account, _depositAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountPrincipalDepositsSCDP(address _account, address _depositAsset) external view returns (uint256) {
        return scdp().accountPrincipalDeposits(_account, _depositAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositFeesGainedSCDP(address _account, address _depositAsset) external view returns (uint256) {
        return
            scdp().accountDepositsWithFees(_account, _depositAsset) - scdp().accountPrincipalDeposits(_account, _depositAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositValueSCDP(
        address _account,
        address _depositAsset,
        bool _ignoreFactors
    ) external view returns (uint256) {
        uint256 principalDeposits = scdp().accountPrincipalDeposits(_account, _depositAsset);
        uint256 scaledDeposits = scdp().accountDepositsWithFees(_account, _depositAsset);

        (uint256 assetValue, ) = collateralAmountToValue(
            _depositAsset,
            principalDeposits > scaledDeposits ? scaledDeposits : principalDeposits,
            _ignoreFactors
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
    function getAccountTotalDepositsValuePrincipalSCDP(address _account, bool _ignoreFactors) external view returns (uint256) {
        return scdp().accountTotalDepositValuePrincipal(_account, _ignoreFactors);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountTotalDepositsValueWithFeesSCDP(address _account) external view returns (uint256) {
        return scdp().accountTotalDepositValueWithFees(_account);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Collaterals                                */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ISCDPStateFacet
    function getDepositAssetsSCDP() external view returns (address[] memory) {
        return scdp().collaterals;
    }

    /// @inheritdoc ISCDPStateFacet
    function getDepositAssetSCDP(address _collateralAsset) external view returns (SCDPCollateral memory) {
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

    /// @inheritdoc ISCDPStateFacet
    function getSwapEnabledSCDP(address _assetIn, address _assetOut) external view returns (bool) {
        return scdp().isSwapEnabled[_assetIn][_assetOut];
    }

    function getCollateralRatioSCDP() public view returns (uint256) {
        uint256 collateralValue = scdp().totalCollateralValueSCDP(false);
        uint256 debtValue = scdp().effectiveDebtValue();
        if (debtValue == 0) return 0;
        return collateralValue.wadDiv(debtValue);
    }

    /// @inheritdoc ISCDPStateFacet
    function getStatisticsSCDP(
        bool _ignoreFactors
    ) external view returns (uint256 collateralValue, uint256 debtValue, uint256 cr) {
        collateralValue = scdp().totalCollateralValueSCDP(_ignoreFactors);
        debtValue = scdp().totalDebtValueAtRatioSCDP(1 ether, _ignoreFactors);
        if (debtValue == 0) return (collateralValue, debtValue, 0);
        cr = collateralValue.wadDiv(debtValue);
    }

    function getCollateralsInfoSCDP() external view returns (AssetData[] memory results) {
        address[] memory collateralAssets = scdp().collaterals;
        results = new AssetData[](collateralAssets.length);

        for (uint256 i; i < collateralAssets.length; ) {
            address asset = collateralAssets[i];
            results[i] = AssetData({
                asset: asset,
                depositAmount: scdp().totalDepositAmount(asset),
                debtAmount: collateralAmountRead(asset, scdp().debt[asset]),
                swapDeposits: scdp().swapDepositAmount(asset),
                krAsset: scdp().krAsset[asset], // just get default values
                collateralAsset: scdp().collateral[asset],
                symbol: IERC20Permit(asset).symbol()
            });
            unchecked {
                i++;
            }
        }
    }

    function getKrAssetsInfoSCDP() external view returns (AssetData[] memory results) {
        address[] memory krAssets = scdp().krAssets;
        results = new AssetData[](krAssets.length);

        for (uint256 i; i < krAssets.length; ) {
            address asset = krAssets[i];
            results[i] = AssetData({
                asset: asset,
                depositAmount: scdp().totalDepositAmount(asset),
                debtAmount: kreskoAssetAmount(asset, scdp().debt[asset]),
                swapDeposits: scdp().swapDepositAmount(asset),
                krAsset: scdp().krAsset[asset], // just get default values
                collateralAsset: scdp().collateral[asset],
                symbol: IERC20Permit(asset).symbol()
            });

            unchecked {
                i++;
            }
        }
    }
}
