// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface ISCDPFacet {
    /**
     * @notice Deposit collateral for account to the collateral pool.
     * @param _account The account to deposit for.
     * @param _collateralAsset The collateral asset to deposit.
     * @param _amount The amount to deposit.
     */
    function depositSCDP(address _account, address _collateralAsset, uint256 _amount) external;

    /**
     * @notice Withdraw collateral for account from the collateral pool.
     * @param _account The account to withdraw for.
     * @param _collateralAsset The collateral asset to withdraw.
     * @param _amount The amount to withdraw.
     */
    function withdrawSCDP(address _account, address _collateralAsset, uint256 _amount) external;

    /**
     * @notice Repay debt for no fees or slippage.
     * @notice Only uses swap deposits, if none available, reverts.
     * @param _repayKrAsset The asset to repay the debt in.
     * @param _repayAmount The amount of the asset to repay the debt with.
     * @param _seizeCollateral The collateral asset to seize.
     */
    function repaySCDP(address _repayKrAsset, uint256 _repayAmount, address _seizeCollateral) external;

    /**
     * @notice Liquidate the collateral pool.
     * @notice Adjusts everyones deposits if swap deposits do not cover the seized amount.
     * @param _repayKrAsset The asset to repay the debt in.
     * @param _repayAmount The amount of the asset to repay the debt with.
     * @param _seizeCollateral The collateral asset to seize.
     */
    function liquidateSCDP(address _repayKrAsset, uint256 _repayAmount, address _seizeCollateral) external;

    function getMaxLiqValueSCDP(address _kreskoAsset, address _seizeCollateral) external view returns (uint256);

    function getLiquidatableSCDP() external view returns (bool);
}
