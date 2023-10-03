// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {MaxLiqInfo} from "common/Types.sol";

interface ILiquidationFacet {
    /**
     * @notice Attempts to liquidate an account by repaying the portion of the account's Kresko asset
     * debt, receiving in return a portion of the account's collateral at a discounted rate.
     * @param _account Account to attempt to liquidate.
     * @param _repayAssetAddr Address of the Kresko asset to be repaid.
     * @param _repayAmount Amount of the Kresko asset to be repaid.
     * @param _seizeAssetAddr Address of the collateral asset to be seized.
     * @param _repayAssetIndex Index of the Kresko asset in the account's minted assets array.
     * @param _seizeAssetIndex Index of the collateral asset in the account's collateral assets array.
     */
    function liquidate(
        address _account,
        address _repayAssetAddr,
        uint256 _repayAmount,
        address _seizeAssetAddr,
        uint256 _repayAssetIndex,
        uint256 _seizeAssetIndex
    ) external;

    /**
     * @notice Internal, used execute _liquidateAssets.
     * @param account The account to attempt to liquidate.
     * @param repayAmount Amount of the Kresko asset to be repaid.
     * @param seizeAmount Alculated amount of collateral assets to be seized.
     * @param repayAsset Address of the Kresko asset to be repaid.
     * @param repayIndex Index of the Kresko asset in the user's minted assets array.
     * @param seizeAsset Address of the collateral asset to be seized.
     * @param seizeAssetIndex Index of the collateral asset in the account's collateral assets array.
     */
    struct ExecutionParams {
        address account;
        uint256 repayAmount;
        uint256 seizeAmount;
        address repayAssetAddr;
        uint256 repayAssetIndex;
        address seizedAssetAddr;
        uint256 seizedAssetIndex;
    }

    /**
     * @dev Calculates the total value that is allowed to be liquidated from an account (if it is liquidatable)
     * @param _account Address of the account to liquidate
     * @param _repayAssetAddr Address of Kresko Asset to repay
     * @param _seizeAssetAddr Address of Collateral to seize
     * @return MaxLiqInfo Calculated information about the maximum liquidation.
     */
    function getMaxLiqValue(
        address _account,
        address _repayAssetAddr,
        address _seizeAssetAddr
    ) external view returns (MaxLiqInfo memory);
}
