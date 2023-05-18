// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.20;
import {PoolCollateral, PoolKrAsset, CollateralPoolState} from "../CollateralPoolState.sol";

interface ICollateralPoolStateFacet {
    /**
     * @notice Get the collateral pool balance for `_account`.
     * @param _account The account.
     * @param _collateralAsset The collateral asset.
     */
    function getPoolAccountDepositsWithFees(address _account, address _collateralAsset) external view returns (uint256);

    /**
     * @notice Get the total collateral principal for `_account`
     * @param _account The account.
     * @param _collateralAsset The collateral asset
     */
    function getPoolAccountPrincipalDeposits(
        address _account,
        address _collateralAsset
    ) external view returns (uint256);

    /**
     * @notice Get the  collateral deposit value for `_account`
     * @param _account The account.
     * @param _collateralAsset The collateral asset
     * @param _ignoreFactors Ignore factors when calculating collateral value.
     */
    function getPoolAccountDepositsValue(
        address _account,
        address _collateralAsset,
        bool _ignoreFactors
    ) external view returns (uint256);

    /**
     * @notice Get the full value of account and fees for `_account`
     * @param _account The account.
     * @param _collateralAsset The collateral asset
     */
    function getPoolAccountDepositsValueWithFees(
        address _account,
        address _collateralAsset
    ) external view returns (uint256);

    /**
     * @notice Get the total collateral deposit value for `_account`
     * @param _account The account.
     * @param _ignoreFactors Ignore factors when calculating collateral value.
     */
    function getPoolAccountTotalDepositsValue(address _account, bool _ignoreFactors) external view returns (uint256);

    /**
     * @notice Get the full value of account and fees for `_account`
     * @param _account The account.
     */
    function getPoolAccountTotalDepositsValueWithFees(address _account) external view returns (uint256);

    /**
     * @notice Get the total collateral deposits for `_collateralAsset`
     * @param _collateralAsset The collateral asset
     */
    function getPoolDeposits(address _collateralAsset) external view returns (uint256);

    /**
     * @notice Get the total collateral deposit value for `_collateralAsset`
     * @param _collateralAsset The collateral asset
     * @param _ignoreFactors Ignore factors when calculating collateral and debt value.
     */
    function getPoolDepositsValue(address _collateralAsset, bool _ignoreFactors) external view returns (uint256);

    /**
     * @notice Get the total collateral swap deposits for `_collateralAsset`
     * @param _collateralAsset The collateral asset
     */
    function getPoolSwapDeposits(address _collateralAsset) external view returns (uint256);

    /**
     * @notice Get the collateral debt amount for `_kreskoAsset`
     * @param _kreskoAsset The KreskoAsset
     */
    function getPoolDebt(address _kreskoAsset) external returns (uint256);

    /**
     * @notice Get the collateral debt value for `_kreskoAsset`
     * @param _kreskoAsset The KreskoAsset
     * @param _ignoreFactors Ignore factors when calculating collateral and debt value.
     */
    function getPoolDebtValue(address _kreskoAsset, bool _ignoreFactors) external returns (uint256);

    /**
     * @notice Get the collateral configuration for `_collateralAsset`
     * @param _collateralAsset The collateral asset
     */
    function getPoolCollateral(address _collateralAsset) external returns (PoolCollateral memory);

    /**
     * @notice Get all pool CollateralAssets
     */
    function getPoolCollateralAssets() external returns (address[] memory);

    /**
     * @notice Get the collateral configuration for `_krAsset`
     * @param _krAsset The collateral asset
     */
    function getPoolKrAsset(address _krAsset) external returns (PoolKrAsset memory);

    /**
     * @notice Get all pool KreskoAssets
     */
    function getPoolKrAssets() external returns (address[] memory);

    /**
     * @notice Get pool collateral value, debt value and resulting CR.
     * @param _ignoreFactors Ignore factors when calculating collateral and debt value.
     */
    function getPoolStats(
        bool _ignoreFactors
    ) external returns (uint256 collateralValue, uint256 debtValue, uint256 cr);

    /**
     * @notice Get the swap fee recipient
     */
    function getPoolSwapFeeRecipient() external returns (address);

    /**
     * @notice Get enabled state of asset
     */
    function getPoolAssetIsEnabled(address _asset) external returns (bool);

    /**
     * @notice Get whether swap is enabled from `_assetIn` to `_assetOut`
     * @param _assetIn The asset to swap from
     * @param _assetOut The asset to swap to
     */
    function getPoolIsSwapEnabled(address _assetIn, address _assetOut) external view returns (bool);
}
