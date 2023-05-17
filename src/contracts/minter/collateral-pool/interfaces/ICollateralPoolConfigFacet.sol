// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.20;
import {PoolKrAsset, PoolCollateral} from "../CollateralPoolState.sol";

interface ICollateralPoolConfigFacet {
    // Emitted when a swap pair is disabled / enabled.
    event PairSet(address indexed assetIn, address indexed assetOut, bool enabled);
    // Emitted when a kresko asset fee is updated.
    event FeeSet(address indexed _asset, uint256 openFee, uint256 closeFee, uint256 protocolFee);

    // Emitted when a collateral is updated.
    event PoolCollateralUpdated(address indexed _asset, uint256 liquidationThreshold);

    // Emitted when a kresko asset is updated.
    event PoolKrAssetUpdated(
        address indexed _asset,
        uint256 openFee,
        uint256 closeFee,
        uint256 protocolFee,
        uint256 supplyLimit
    );

    // Used for setting swap pairs enabled or disabled in the pool.
    struct PairSetter {
        address assetIn;
        address assetOut;
        bool enabled;
    }

    /**
     * @notice Initialize the collateral pool.
     * Callable by diamond owner only.
     * @param _mcr The minimum collateralization ratio.
     * @param _lt The liquidation threshold.
     */
    function initialize(address _feeReceiver, uint256 _mcr, uint256 _lt) external;

    /**
     * @notice Enable kresko assets in the pool.
     * Only callable by admin.
     * @param _enabledKrAssets The list of KreskoAssets to enable
     * @param _configurations The configurations for the KreskoAssets. Must match length above.
     */
    function enablePoolKrAssets(address[] memory _enabledKrAssets, PoolKrAsset[] memory _configurations) external;

    /**
     * @notice Enable collaterals in the pool.
     * Only callable by admin.
     * @param _enabledCollaterals The list of collaterals to enable
     * @param _configurations The configurations for the collaterals. Must match length above.
     */
    function enablePoolCollaterals(
        address[] calldata _enabledCollaterals,
        PoolCollateral[] memory _configurations
    ) external;

    /**
     * @notice Update the KreskoAsset pool configuration.
     * Only callable by admin.
     * @param _asset The KreskoAsset to update
     * @param _configuration The configuration.
     * emits PoolKrAssetUpdated
     */
    function updatePoolKrAsset(address _asset, PoolKrAsset calldata _configuration) external;

    /**
     * @notice Update the collateral configuration.
     * Only callable by admin.
     * @param _asset The KreskoAsset to update
     * @param _newLiquidationIncentive The new liquidation incentive.
     * emits PoolCollateralUpdated
     */
    function updatePoolCollateral(address _asset, uint256 _newLiquidationIncentive) external;

    /**
     * @notice Disabled swaps and deposits for collaterals in the pool.
     * Only callable by admin.
     * @param _disabledAssets The list of collaterals to disable
     */
    function disablePoolCollaterals(address[] calldata _disabledAssets) external;

    /**
     * @notice Disabled swaps for krAssets in the pool.
     * Only callable by admin.
     * @param _disabledAssets The list of krAssets to disable
     */
    function disablePoolKrAssets(address[] calldata _disabledAssets) external;

    /**
     * @notice Completely removes collaterals from the pool.
     * Only callable by admin.
     * _removedAssets must not have any deposits.
     * @param _removedAssets The list of collaterals to remove
     */
    function removePoolCollaterals(address[] calldata _removedAssets) external;

    /**
     * @notice Completely remove KreskoAssets from the pool
     * Only callable by admin.
     * _removedAssets must not have any debt.
     * @param _removedAssets The list of KreskoAssets to remove
     */
    function removePoolKrAssets(address[] calldata _removedAssets) external;

    /**
     * @notice Set whether pairs are enabled or not. Both ways.
     * Only callable by admin.
     * @param _setters The configurations to set.
     */
    function setSwapPairs(PairSetter[] calldata _setters) external;

    /**
     * @notice Set whether a swap pair is enabled or not.
     * Only callable by admin.
     * @param _setter The configuration to set
     */
    function setSwapPairsSingle(PairSetter calldata _setter) external;

    /**
     * @notice Sets the fees for a kresko asset
     * @dev Only callable by admin.
     * @param _krAsset The kresko asset to set fees for.
     * @param _openFee The new open fee.
     * @param _closeFee The new close fee.
     * @param _protocolFee The protocol fee share.
     */
    function setFees(address _krAsset, uint256 _openFee, uint256 _closeFee, uint256 _protocolFee) external;
}
