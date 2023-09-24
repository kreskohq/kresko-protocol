// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface ILiquidationFacet {
    /**
     * @notice Attempts to liquidate an account by repaying the portion of the account's Kresko asset
     *         princpal debt, receiving in return a portion of the account's collateral at a discounted rate.
     * @param _account The account to attempt to liquidate.
     * @param _repayAsset The address of the Kresko asset to be repaid.
     * @param _repayAmount The amount of the Kresko asset to be repaid.
     * @param _seizeAsset The address of the collateral asset to be seized.
     * @param _repayAssetIndex The index of the Kresko asset in the account's minted assets array.
     * @param _seizeAssetIndex Index of the collateral asset in the account's collateral assets array.
     * @param _allowSeizeUnderflow Allow the amount of collateral to be seized to be less than the amount calculated.
     */
    function liquidate(
        address _account,
        address _repayAsset,
        uint256 _repayAmount,
        address _seizeAsset,
        uint256 _repayAssetIndex,
        uint256 _seizeAssetIndex,
        bool _allowSeizeUnderflow
    ) external;

    /**
     * @notice used execute _liquidateAssets.
     * @param account The account to attempt to liquidate.
     * @param repayAmount The amount of the Kresko asset to be repaid.
     * @param seizeAmount The calculated amount of collateral assets to be seized.
     * @param repayAsset The address of the Kresko asset to be repaid.
     * @param repayIndex The index of the Kresko asset in the user's minted assets array.
     * @param seizeAsset The address of the collateral asset to be seized.
     * @param seizeAssetIndex The index of the collateral asset in the account's collateral assets array.
     * @param allowSeizeUnderflow Allow the amount of collateral to be seized to be less than the amount calculated.
     */

    struct ExecutionParams {
        address account;
        uint256 repayAmount;
        uint256 seizeAmount;
        address repayAsset;
        uint256 repayAssetIndex;
        address seizedAsset;
        uint256 seizedAssetIndex;
        bool allowSeizeUnderflow;
    }

    /**
     * @dev Calculates the total value that can be liquidated for a liquidation pair
     * @param _account address to liquidate
     * @param _repayKreskoAsset address of the kreskoAsset being repaid on behalf of the liquidatee
     * @return maxLiquidatableUSD USD value that can be liquidated, 0 if the pair has no liquidatable value
     */
    function getMaxLiquidation(
        address _account,
        address _repayKreskoAsset,
        address _collateralAssetToSeize
    ) external view returns (uint256 maxLiquidatableUSD);
}
