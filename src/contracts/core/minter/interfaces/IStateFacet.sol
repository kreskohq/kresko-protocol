// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {MinterParams} from "minter/Types.sol";

interface IStateFacet {
    /// @notice The collateralization ratio at which positions may be liquidated.
    function getLiquidationThreshold() external view returns (uint256);

    /// @notice Multiplies max liquidation multiplier, if a full liquidation happens this is the resulting CR.
    function getMaxLiquidationRatio() external view returns (uint256);

    /// @notice The minimum ratio of collateral to debt that can be taken by direct action.
    function getMinCollateralRatio() external view returns (uint256);

    /// @notice simple check if kresko asset exists
    function getKrAssetExists(address _krAsset) external view returns (bool);

    /// @notice simple check if collateral asset exists
    function getCollateralExists(address _collateralAsset) external view returns (bool);

    /// @notice get all meaningful protocol parameters
    function getMinterParameters() external view returns (MinterParams memory);

    /**
     * @notice Gets the USD value for a single collateral asset and amount.
     * @param _collateralAsset The address of the collateral asset.
     * @param _amount The amount of the collateral asset to calculate the value for.
     * @param _ignoreCollateralFactor Boolean indicating if the asset's collateral factor should be ignored.
     */
    function getCollateralAmountToValue(
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreCollateralFactor
    ) external view returns (uint256, uint256);

    /**
     * @notice Gets the USD value for a single Kresko asset and amount.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _amount The amount of the Kresko asset to calculate the value for.
     * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
     * @return The value for the provided amount of the Kresko asset.
     */
    function getDebtAmountToValue(address _kreskoAsset, uint256 _amount, bool _ignoreKFactor) external view returns (uint256);
}
