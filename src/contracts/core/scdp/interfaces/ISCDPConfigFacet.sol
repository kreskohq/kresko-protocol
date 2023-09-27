// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {SCDPInitArgs, PairSetter} from "scdp/Types.sol";

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
    function setMinCollateralRatioSCDP(uint32 _mcr) external;

    /// @notice Set the pool liquidation threshold.
    function setLiquidationThresholdSCDP(uint32 _lt) external;

    /// @notice Set the pool max liquidation ratio.
    function setMaxLiquidationRatioSCDP(uint32 _mlr) external;

    /// @notice Set the @param _newliquidationIncentive for @param _krAsset.
    function updateLiquidationIncentiveSCDP(address _krAsset, uint16 _newLiquidationIncentive) external;

    /**
     * @notice Update the deposit asset limit configuration.
     * Only callable by admin.
     * @param _asset The Collateral asset to update
     * @param _newDepositLimit The new deposit limit for the collateral
     * emits PoolCollateralUpdated
     */
    function updateDepositLimitSCDP(address _asset, uint128 _newDepositLimit) external;

    /**
     * @notice Disabled swaps and deposits for assets.
     * Only callable by admin.
     * @param _disabledAssets The list of assets to disable
     * @param onlyDeposits If true, only deposits are disabled. If false, swaps are disabled as well.
     */
    function disableAssetsSCDP(address[] calldata _disabledAssets, bool onlyDeposits) external;

    /**
     * @notice Enables assets.
     * Only callable by admin.
     * @param _enabledAssets The list of assets to enable
     * @param enableDeposits If true, both deposits and swaps are enabled. If false, only swaps are enabled.
     */
    function enableAssetsSCDP(address[] calldata _enabledAssets, bool enableDeposits) external;

    /**
     * @notice Completely removes a collateral assets.
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
    function setSwapFee(address _krAsset, uint16 _openFee, uint16 _closeFee, uint16 _protocolFee) external;
}
