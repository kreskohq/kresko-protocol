// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
import {ISCDPStateFacet} from "../interfaces/ISCDPStateFacet.sol";
import {scdp, PoolCollateral, PoolKrAsset} from "../SCDPStorage.sol";
import {ms} from "minter/MinterStorage.sol";
import {WadRay} from "common/libs/WadRay.sol";

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
    function getPoolAccountDepositsValue(
        address _account,
        address _collateralAsset,
        bool _ignoreFactors
    ) external view returns (uint256) {
        uint256 principalDeposits = scdp().getAccountPrincipalDeposits(_account, _collateralAsset);
        uint256 scaledDeposits = scdp().getAccountDepositsWithFees(_account, _collateralAsset);

        (uint256 assetValue, ) = ms().getCollateralValueAndOraclePrice(
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
        (uint256 assetValue, ) = ms().getCollateralValueAndOraclePrice(
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
                debtAmount: ms().getKreskoAssetAmount(asset, scdp().debt[asset]),
                krAsset: scdp().poolKrAsset[asset], // just get default values
                collateralAsset: scdp().poolCollateral[asset]
            });
            unchecked {
                i++;
            }
        }
    }

    function getPoolKrAssetsInfo() external view returns (AssetData[] memory results) {
        address[] memory krAssets = scdp().krAssets;
        results = new AssetData[](krAssets.length);

        for (uint256 i = 0; i < krAssets.length; i++) {
            address asset = krAssets[i];
            results[i] = AssetData({
                asset: asset,
                depositAmount: scdp().getPoolDeposits(asset),
                debtAmount: ms().getKreskoAssetAmount(asset, scdp().debt[asset]),
                krAsset: scdp().poolKrAsset[asset], // just get default values
                collateralAsset: scdp().poolCollateral[asset]
            });
        }
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolAccountTotalDepositsValue(address _account, bool _ignoreFactors) external view returns (uint256) {
        return scdp().getAccountTotalDepositValuePrincipal(_account, _ignoreFactors);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolAccountTotalDepositsValueWithFees(address _account) external view returns (uint256) {
        return scdp().getAccountTotalDepositValueWithFees(_account);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolDeposits(address _collateralAsset) external view returns (uint256) {
        return scdp().getPoolDeposits(_collateralAsset);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolDepositsValue(address _collateralAsset, bool _ignoreFactors) external view returns (uint256) {
        (uint256 assetValue, ) = ms().getCollateralValueAndOraclePrice(
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
        return ms().getKreskoAssetAmount(_kreskoAsset, scdp().debt[_kreskoAsset]);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolDebtValue(bool _ignoreFactors) external view returns (uint256) {
        return scdp().getTotalPoolKrAssetValueAtRatio(1 ether, _ignoreFactors);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolKrAssetDebtValue(address _kreskoAsset, bool _ignoreFactors) external view returns (uint256) {
        return
            ms().getKrAssetValue(
                _kreskoAsset,
                ms().getKreskoAssetAmount(_kreskoAsset, scdp().debt[_kreskoAsset]),
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

    /// @inheritdoc ISCDPStateFacet
    function getPoolStats(
        bool _ignoreFactors
    ) external view returns (uint256 collateralValue, uint256 debtValue, uint256 cr) {
        collateralValue = scdp().getTotalPoolDepositValue(_ignoreFactors);
        debtValue = scdp().getTotalPoolKrAssetValueAtRatio(1 ether, _ignoreFactors);
        if (debtValue == 0) return (collateralValue, debtValue, 0);
        cr = collateralValue.wadDiv(debtValue);
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolSwapFeeRecipient() external view returns (address) {
        return scdp().swapFeeRecipient;
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolAssetIsEnabled(address _asset) external view returns (bool) {
        return scdp().isEnabled[_asset];
    }

    /// @inheritdoc ISCDPStateFacet
    function getPoolIsSwapEnabled(address _assetIn, address _assetOut) external view returns (bool) {
        return scdp().isSwapEnabled[_assetIn][_assetOut];
    }
}
