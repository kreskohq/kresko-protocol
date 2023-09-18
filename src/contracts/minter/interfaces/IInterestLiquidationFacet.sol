// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface IInterestLiquidationFacet {
    /**
     * @notice Attempts to batch liquidate all KISS interest accrued for an account in a unhealthy position
     * @notice Liquidator must have the KISS balance required with the Kresko contract approved
     * @notice Checks liquidatable status on each iteration liquidating only what is necessary
     * @param _account The account to attempt to liquidate.
     * @param _collateralAssetToSeize The address of the collateral asset to be seized.
     * @param _allowSeizeUnderflow Allow the amount of collateral to be seized to be less than the amount calculated.
     */
    function batchLiquidateInterest(address _account, address _collateralAssetToSeize, bool _allowSeizeUnderflow) external;

    /**
     * @notice Attempts to liquidate all KISS interest accrued for an account in a unhealthy position
     * @notice Liquidator must have the KISS balance required with the Kresko contract approved
     * @param _account The account to attempt to liquidate.
     * @param _repayKreskoAsset The address of the Kresko asset to be repaid.
     * @param _collateralAssetToSeize The address of the collateral asset to be seized.
     * @param _allowSeizeUnderflow Allow the amount of collateral to be seized to be less than the amount calculated.
     */
    function liquidateInterest(
        address _account,
        address _repayKreskoAsset,
        address _collateralAssetToSeize,
        bool _allowSeizeUnderflow
    ) external;
}
