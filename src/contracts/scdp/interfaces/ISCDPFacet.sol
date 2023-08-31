// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

interface ISCDPFacet {
    event CollateralPoolDeposit(address indexed depositor, address indexed collateralAsset, uint256 amount);
    event CollateralPoolWithdraw(
        address indexed withdrawer,
        address indexed collateralAsset,
        uint256 amount,
        uint256 feeAmount
    );
    event CollateralPoolRepayment(
        address indexed repayer,
        address indexed repayKreskoAsset,
        uint256 repayAmount,
        address indexed receiveKreskoAsset,
        uint256 receiveAmount
    );

    event CollateralPoolLiquidationOccured(
        address indexed liquidator,
        address indexed repayKreskoAsset,
        uint256 repayAmount,
        address indexed seizeCollateral,
        uint256 seizeAmount
    );

    /**
     * @notice Deposit collateral for account to the collateral pool.
     * @param _account The account to deposit for.
     * @param _collateralAsset The collateral asset to deposit.
     * @param _amount The amount to deposit.
     */
    function poolDeposit(address _account, address _collateralAsset, uint256 _amount) external;

    /**
     * @notice Withdraw collateral for account from the collateral pool.
     * @param _account The account to withdraw for.
     * @param _collateralAsset The collateral asset to withdraw.
     * @param _amount The amount to withdraw.
     */
    function poolWithdraw(address _account, address _collateralAsset, uint256 _amount) external;

    /**
     * @notice Repay debt for no fees or slippage.
     * @notice Only uses swap deposits, if none available, reverts.
     * @param _repayKrAsset The asset to repay the debt in.
     * @param _repayAmount The amount of the asset to repay the debt with.
     * @param _seizeCollateral The collateral asset to seize.
     */
    function poolRepay(address _repayKrAsset, uint256 _repayAmount, address _seizeCollateral) external;

    /**
     * @notice Liquidate the collateral pool.
     * @notice Adjusts everyones deposits if swap deposits do not cover the seized amount.
     * @param _repayKrAsset The asset to repay the debt in.
     * @param _repayAmount The amount of the asset to repay the debt with.
     * @param _seizeCollateral The collateral asset to seize.
     */
    function poolLiquidate(address _repayKrAsset, uint256 _repayAmount, address _seizeCollateral) external;

    function getMaxLiquidationSCDP(address _kreskoAsset, address _seizeCollateral) external view returns (uint256);
}
