// SDPX-License-Identifier: MIT
pragma solidity >=0.8.14;

interface ICollateralPoolFacet {
    event CollateralPoolDeposit(address indexed depositor, address indexed collateralAsset, uint256 amount);
    event CollateralPoolWithdraw(
        address indexed withdrawer,
        address indexed collateralAsset,
        uint256 amount,
        uint256 feeAmount
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
}
