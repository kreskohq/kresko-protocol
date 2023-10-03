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

    /// @notice Set the @param _newliqIncentive for @param _krAsset.
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
     * @notice Disable or enable a deposit asset. Reverts if invalid asset.
     * Only callable by admin.
     * @param _assetAddr Asset to set.
     * @param _enabled Whether to enable or disable the asset.
     */
    function setDepositAssetSCDP(address _assetAddr, bool _enabled) external;

    /**
     * @notice Disable or enable asset from collateral value calculations.
     * Reverts if invalid asset and if disabling asset that has user deposits.
     * Only callable by admin.
     * @param _assetAddr Asset to set.
     * @param _enabled Whether to enable or disable the asset.
     */
    function setCollateralSCDP(address _assetAddr, bool _enabled) external;

    /**
     * @notice Disable or enable a kresko asset in SCDP.
     * Reverts if invalid asset. Enabling will also add it to collateral value calculations.
     * Only callable by admin.
     * @param _assetAddr Asset to set.
     * @param _enabled Whether to enable or disable the asset.
     */
    function setKrAssetSCDP(address _assetAddr, bool _enabled) external;

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
