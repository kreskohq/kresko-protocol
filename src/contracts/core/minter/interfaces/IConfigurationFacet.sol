// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {MinterInitArgs} from "minter/Types.sol";

interface IConfigurationFacet {
    function initializeMinter(MinterInitArgs calldata args) external;

    /**
     * @notice Updates the liquidation incentive multiplier.
     * @param _collateralAsset The collateral asset to update.
     * @param _newLiquidationIncentive The new liquidation incentive multiplier for the asset.
     */
    function updateLiquidationIncentive(address _collateralAsset, uint256 _newLiquidationIncentive) external;

    /**
     * @notice  Updates the cFactor of a KreskoAsset.
     * @param _collateralAsset The collateral asset.
     * @param _newFactor The new collateral factor.
     */
    function updateCollateralFactor(address _collateralAsset, uint256 _newFactor) external;

    /**
     * @notice Updates the kFactor of a KreskoAsset.
     * @param _kreskoAsset The KreskoAsset.
     * @param _kFactor The new kFactor.
     */
    function updateKFactor(address _kreskoAsset, uint256 _kFactor) external;

    /**
     * @dev Updates the contract's collateralization ratio.
     * @param _newMinCollateralRatio The new minimum collateralization ratio as wad.
     */
    function updateMinCollateralRatio(uint256 _newMinCollateralRatio) external;

    /**
     * @dev Updates the contract's liquidation threshold value
     * @param _newThreshold The new liquidation threshold value
     */
    function updateLiquidationThreshold(uint256 _newThreshold) external;

    /**
     * @notice Updates the max liquidation ratior value.
     * @notice This is the maximum collateral ratio that liquidations can liquidate to.
     * @param _newMaxLiquidationRatio Percent value in wad precision.
     */
    function updateMaxLiquidationRatio(uint256 _newMaxLiquidationRatio) external;
}
