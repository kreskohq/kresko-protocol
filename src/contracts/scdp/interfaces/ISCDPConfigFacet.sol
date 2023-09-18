// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {SCDPKrAsset, SCDPCollateral, SCDPInitArgs, PairSetter} from "scdp/Types.sol";

interface ISCDPConfigFacet {
    /**
     * @notice Initialize SCDP.
     * Callable by diamond owner only.
     * @param _init The initial configuration.
     */
    function initializeSCDP(SCDPInitArgs memory _init) external;

    /// @notice Get the pool configuration.
    function getCurrentParametersSCDP() external view returns (SCDPInitArgs memory);

    function setFeeAssetSCDP(address asset) external;

    /// @notice Set the pool minimum collateralization ratio.
    function setMinCollateralRatioSCDP(uint256 _mcr) external;

    /// @notice Set the pool liquidation threshold.
    function setLiquidationThresholdSCDP(uint256 _lt) external;

    /**
     * @notice Enable collaterals in the pool.
     * Only callable by admin.
     * @param _enabledCollaterals The list of collaterals to enable
     * @param _configurations The configurations for the collaterals. Must match length above.
     */
    function enableCollateralsSCDP(address[] calldata _enabledCollaterals, SCDPCollateral[] memory _configurations) external;

    /**
     * @notice Enable kresko assets in the pool.
     * Only callable by admin.
     * @param _enabledKrAssets The list of KreskoAssets to enable
     * @param _configurations The configurations for the KreskoAssets. Must match length above.
     */
    function enableKrAssetsSCDP(address[] calldata _enabledKrAssets, SCDPKrAsset[] memory _configurations) external;

    /**
     * @notice Update the KreskoAsset pool configuration.
     * Only callable by admin.
     * @param _asset The KreskoAsset to update
     * @param _configuration The configuration.
     * emits PoolKrAssetUpdated
     */
    function updateKrAssetSCDP(address _asset, SCDPKrAsset memory _configuration) external;

    /**
     * @notice Update the collateral configuration.
     * Only callable by admin.
     * @param _asset The Collateral asset to update
     * @param _newDepositLimit The new deposit limit for the collateral
     * emits PoolCollateralUpdated
     */
    function updateCollateralSCDP(address _asset, uint256 _newDepositLimit) external;

    /**
     * @notice Disabled swaps and deposits for collaterals in the pool.
     * Only callable by admin.
     * @param _disabledAssets The list of collaterals to disable
     */
    function disableCollateralsSCDP(address[] calldata _disabledAssets) external;

    /**
     * @notice Disabled swaps for krAssets in the pool.
     * Only callable by admin.
     * @param _disabledAssets The list of krAssets to disable
     */
    function disableKrAssetsSCDP(address[] calldata _disabledAssets) external;

    /**
     * @notice Completely removes collaterals from the pool.
     * Only callable by admin.
     * _removedAssets must not have any deposits.
     * @param _removedAssets The list of collaterals to remove
     */
    function removeCollateralsSCDP(address[] calldata _removedAssets) external;

    /**
     * @notice Completely remove KreskoAssets from the pool
     * Only callable by admin.
     * _removedAssets must not have any debt.
     * @param _removedAssets The list of KreskoAssets to remove
     */
    function removeKrAssetsSCDP(address[] calldata _removedAssets) external;

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
    function setSwapFee(address _krAsset, uint256 _openFee, uint256 _closeFee, uint256 _protocolFee) external;
}
