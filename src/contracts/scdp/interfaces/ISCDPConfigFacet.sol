// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
import {PoolKrAsset, PoolCollateral} from "../SCDPStorage.sol";

interface ISCDPConfigFacet {
    /**
     * @notice SCDP initializer configuration.
     * @param _swapFeeRecipient The swap fee recipient.
     * @param _mcr The minimum collateralization ratio.
     * @param _lt The liquidation threshold.
     */
    struct SCDPInitArgs {
        address swapFeeRecipient;
        uint256 mcr;
        uint256 lt;
    }
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
     * @notice Initialize SCDP.
     * Callable by diamond owner only.
     * @param _init The initial configuration.
     */
    function initialize(SCDPInitArgs memory _init) external;

    /// @notice Get the pool configuration.
    function getSCDPConfig() external view returns (SCDPInitArgs memory);

    function setSCDPFeeAsset(address asset) external;

    /// @notice Set the pool minimum collateralization ratio.
    function setSCDPMCR(uint256 _mcr) external;

    /// @notice Set the pool liquidation threshold.
    function setSCDPLT(uint256 _lt) external;

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
     * @param _asset The Collateral asset to update
     * @param _newDepositLimit The new deposit limit for the collateral
     * emits PoolCollateralUpdated
     */
    function updatePoolCollateral(address _asset, uint256 _newDepositLimit) external;

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
    function setSwapFee(address _krAsset, uint256 _openFee, uint256 _closeFee, uint256 _protocolFee) external;
}
