// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.20;
import {ICollateralPoolStateFacet} from "../interfaces/ICollateralPoolStateFacet.sol";
import {cps, PoolCollateral, PoolKrAsset} from "../CollateralPoolState.sol";
import {ms} from "../../MinterStorage.sol";
import {WadRay} from "../../../libs/WadRay.sol";

/**
 * @title CollateralPoolStateFacet
 * @author Kresko
 * @notice  This facet is used to view the state of the collateral pool.
 */
contract CollateralPoolStateFacet is ICollateralPoolStateFacet {
    using WadRay for uint256;

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolAccountDepositsWithFees(
        address _account,
        address _collateralAsset
    ) external view returns (uint256) {
        return cps().getAccountDepositsWithFees(_account, _collateralAsset);
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolAccountPrincipalDeposits(
        address _account,
        address _collateralAsset
    ) external view returns (uint256) {
        return cps().getAccountPrincipalDeposits(_account, _collateralAsset);
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolAccountDepositsValue(
        address _account,
        address _collateralAsset,
        bool _ignoreFactors
    ) external view returns (uint256) {
        (uint256 assetValue, ) = ms().getCollateralValueAndOraclePrice(
            _collateralAsset,
            cps().getAccountPrincipalDeposits(_account, _collateralAsset),
            _ignoreFactors
        );

        return assetValue;
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolAccountDepositsValueWithFees(
        address _account,
        address _collateralAsset
    ) external view returns (uint256) {
        (uint256 assetValue, ) = ms().getCollateralValueAndOraclePrice(
            _collateralAsset,
            cps().getAccountDepositsWithFees(_account, _collateralAsset),
            true
        );

        return assetValue;
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolAccountTotalDepositsValue(address _account, bool _ignoreFactors) external view returns (uint256) {
        return cps().getAccountTotalDepositValuePrincipal(_account, _ignoreFactors);
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolAccountTotalDepositsValueWithFees(address _account) external view returns (uint256) {
        return cps().getAccountTotalDepositValueWithFees(_account);
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolDeposits(address _collateralAsset) external view returns (uint256) {
        return cps().getPoolDeposits(_collateralAsset);
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolDepositsValue(address _collateralAsset, bool _ignoreFactors) external view returns (uint256) {
        (uint256 assetValue, ) = ms().getCollateralValueAndOraclePrice(
            _collateralAsset,
            cps().getPoolDeposits(_collateralAsset),
            _ignoreFactors
        );

        return assetValue;
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolSwapDeposits(address _collateralAsset) external view returns (uint256) {
        return cps().getPoolSwapDeposits(_collateralAsset);
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolDebt(address _kreskoAsset) external view returns (uint256) {
        return ms().getKreskoAssetAmount(_kreskoAsset, cps().debt[_kreskoAsset]);
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolDebtValue(address _kreskoAsset, bool _ignoreFactors) external view returns (uint256) {
        return
            ms().getKrAssetValue(
                _kreskoAsset,
                ms().getKreskoAssetAmount(_kreskoAsset, cps().debt[_kreskoAsset]),
                _ignoreFactors
            );
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolCollateral(address _collateralAsset) external view returns (PoolCollateral memory) {
        return cps().poolCollateral[_collateralAsset];
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolCollateralAssets() external view returns (address[] memory) {
        return cps().collaterals;
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolKrAsset(address _krAsset) external view returns (PoolKrAsset memory) {
        return cps().poolKrAsset[_krAsset];
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolKrAssets() external view returns (address[] memory) {
        return cps().krAssets;
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolStats(
        bool _ignoreFactors
    ) external view returns (uint256 collateralValue, uint256 debtValue, uint256 cr) {
        collateralValue = cps().getTotalPoolDepositValue(_ignoreFactors);
        debtValue = cps().getTotalPoolKrAssetValueAtRatio(
            _ignoreFactors ? 1 ether : cps().minimumCollateralizationRatio,
            _ignoreFactors
        );
        if (debtValue == 0) return (collateralValue, debtValue, 0);
        cr = collateralValue.wadDiv(debtValue);
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolSwapFeeRecipient() external view returns (address) {
        return cps().swapFeeRecipient;
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolAssetIsEnabled(address _asset) external view returns (bool) {
        return cps().isEnabled[_asset];
    }

    /// @inheritdoc ICollateralPoolStateFacet
    function getPoolIsSwapEnabled(address _assetIn, address _assetOut) external view returns (bool) {
        return cps().isSwapEnabled[_assetIn][_assetOut];
    }
}
