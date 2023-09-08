// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {ISCDPStateFacet} from "scdp/interfaces/ISCDPStateFacet.sol";
import {sdi} from "scdp/libs/LibSDI.sol";
import {scdp, PoolCollateral, PoolKrAsset} from "scdp/libs/LibSCDP.sol";
import {ms} from "minter/libs/LibMinterBig.sol";
import {WadRay} from "common/libs/WadRay.sol";
import {IERC20Permit} from "common/IERC20Permit.sol";
import {Shared} from "common/libs/Shared.sol";
import {Rebase} from "common/libs/Rebase.sol";

/**
 * @title SCDPStateFacet
 * @author Kresko
 * @notice  This facet is used to view the state of the scdp.
 */

contract SCDPStateFacet is ISCDPStateFacet {
    using WadRay for uint256;

    /// @inheritdoc ISCDPStateFacet
    function getPoolAccountDepositsWithFees(
        address _account,
        address _collateralAsset
    ) external view returns (uint256) {
        return scdp().getAccountDepositsWithFees(_account, _collateralAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolAccountPrincipalDeposits(
        address _account,
        address _collateralAsset
    ) external view returns (uint256) {
        return scdp().getAccountPrincipalDeposits(_account, _collateralAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolAccountFeesGained(address _account, address _collateralAsset) external view returns (uint256) {
        return
            scdp().getAccountDepositsWithFees(_account, _collateralAsset) -
            scdp().getAccountPrincipalDeposits(_account, _collateralAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolAccountDepositsValue(
        address _account,
        address _collateralAsset,
        bool _ignoreFactors
    ) external view returns (uint256) {
        uint256 principalDeposits = scdp().getAccountPrincipalDeposits(_account, _collateralAsset);
        uint256 scaledDeposits = scdp().getAccountDepositsWithFees(_account, _collateralAsset);

        (uint256 assetValue, ) = ms().getCollateralValueAndPrice(
            _collateralAsset,
            principalDeposits > scaledDeposits ? scaledDeposits : principalDeposits,
            _ignoreFactors
        );

        return assetValue;
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolAccountDepositsValueWithFees(
        address _account,
        address _collateralAsset
    ) external view returns (uint256) {
        (uint256 assetValue, ) = ms().getCollateralValueAndPrice(
            _collateralAsset,
            scdp().getAccountDepositsWithFees(_account, _collateralAsset),
            true
        );

        return assetValue;
    }

    function getPoolCollateralsInfo() external view returns (AssetData[] memory results) {
        address[] memory collateralAssets = scdp().collaterals;
        results = new AssetData[](collateralAssets.length);

        for (uint256 i; i < collateralAssets.length; ) {
            address asset = collateralAssets[i];
            results[i] = AssetData({
                asset: asset,
                depositAmount: scdp().getPoolDeposits(asset),
                debtAmount: Rebase.getCollateralAmountRead(asset, scdp().debt[asset]),
                swapDeposits: scdp().getPoolSwapDeposits(asset),
                krAsset: scdp().poolKrAsset[asset], // just get default values
                collateralAsset: scdp().poolCollateral[asset],
                symbol: IERC20Permit(asset).symbol()
            });
            unchecked {
                i++;
            }
        }
    }

    function getPoolKrAssetsInfo() external view returns (AssetData[] memory results) {
        address[] memory krAssets = scdp().krAssets;
        results = new AssetData[](krAssets.length);

        for (uint256 i; i < krAssets.length; ) {
            address asset = krAssets[i];
            results[i] = AssetData({
                asset: asset,
                depositAmount: scdp().getPoolDeposits(asset),
                debtAmount: Rebase.getKreskoAssetAmount(asset, scdp().debt[asset]),
                swapDeposits: scdp().getPoolSwapDeposits(asset),
                krAsset: scdp().poolKrAsset[asset], // just get default values
                collateralAsset: scdp().poolCollateral[asset],
                symbol: IERC20Permit(asset).symbol()
            });

            unchecked {
                i++;
            }
        }
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolAccountTotalDepositsValue(address _account, bool _ignoreFactors) external view returns (uint256) {
        return Shared.getAccountTotalDepositValuePrincipal(_account, _ignoreFactors);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolAccountTotalDepositsValueWithFees(address _account) external view returns (uint256) {
        return Shared.getAccountTotalDepositValueWithFees(_account);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolDeposits(address _collateralAsset) external view returns (uint256) {
        return scdp().getPoolDeposits(_collateralAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolDepositsValue(address _collateralAsset, bool _ignoreFactors) external view returns (uint256) {
        (uint256 assetValue, ) = ms().getCollateralValueAndPrice(
            _collateralAsset,
            scdp().getPoolDeposits(_collateralAsset),
            _ignoreFactors
        );

        return assetValue;
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolSwapDeposits(address _collateralAsset) external view returns (uint256) {
        return scdp().getPoolSwapDeposits(_collateralAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolKrAssetDebt(address _kreskoAsset) external view returns (uint256) {
        return Rebase.getKreskoAssetAmount(_kreskoAsset, scdp().debt[_kreskoAsset]);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolDebtValue(bool _ignoreFactors) external view returns (uint256) {
        return Shared.getTotalPoolKrAssetValueAtRatio(1 ether, _ignoreFactors);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolCollateralValue(bool _ignoreFactors) external view returns (uint256) {
        return Shared.getTotalPoolDepositValue(_ignoreFactors);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolKrAssetDebtValue(address _kreskoAsset, bool _ignoreFactors) external view returns (uint256) {
        return
            Shared.getKrAssetValue(
                _kreskoAsset,
                Rebase.getKreskoAssetAmount(_kreskoAsset, scdp().debt[_kreskoAsset]),
                _ignoreFactors
            );
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolCollateral(address _collateralAsset) external view returns (PoolCollateral memory) {
        return scdp().poolCollateral[_collateralAsset];
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolCollateralAssets() external view returns (address[] memory) {
        return scdp().collaterals;
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolKrAsset(address _krAsset) external view returns (PoolKrAsset memory) {
        return scdp().poolKrAsset[_krAsset];
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolKrAssets() external view returns (address[] memory) {
        return scdp().krAssets;
    }

    function getPoolCR() external view returns (uint256) {
        uint256 collateralValue = Shared.getTotalPoolDepositValue(false);
        uint256 debtValue = sdi().effectiveDebtUSD();
        if (debtValue == 0) return 0;
        return collateralValue.wadDiv(debtValue);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolStats(
        bool _ignoreFactors
    ) external view returns (uint256 collateralValue, uint256 debtValue, uint256 cr) {
        collateralValue = Shared.getTotalPoolDepositValue(_ignoreFactors);
        debtValue = Shared.getTotalPoolKrAssetValueAtRatio(1 ether, _ignoreFactors);
        if (debtValue == 0) return (collateralValue, debtValue, 0);
        cr = collateralValue.wadDiv(debtValue);
    }

    /// @inheritdoc ISCDPStateFacet
    function getSCDPFeeRecipient() external view returns (address) {
        return scdp().swapFeeRecipient;
    }

    /// @inheritdoc ISCDPStateFacet
    function getSCDPAssetEnabled(address _asset) external view returns (bool) {
        return scdp().isEnabled[_asset];
    }

    /// @inheritdoc ISCDPStateFacet
    function getSCDPSwapEnabled(address _assetIn, address _assetOut) external view returns (bool) {
        return scdp().isSwapEnabled[_assetIn][_assetOut];
    }
}
