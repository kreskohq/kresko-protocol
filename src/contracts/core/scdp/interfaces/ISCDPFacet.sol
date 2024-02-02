// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {MaxLiqInfo} from "common/Types.sol";
import {SCDPLiquidationArgs, SCDPRepayArgs, SCDPWithdrawArgs} from "common/Args.sol";

interface ISCDPFacet {
    /**
     * @notice Deposit collateral for account to the collateral pool.
     * @param _account The account to deposit for.
     * @param _collateralAsset The collateral asset to deposit.
     * @param _amount The amount to deposit.
     */
    function depositSCDP(address _account, address _collateralAsset, uint256 _amount) external payable;

    /**
     * @notice Withdraw collateral for account from the collateral pool.
     * @param _args WithdrawArgs struct containing withdraw data.
     */
    function withdrawSCDP(SCDPWithdrawArgs memory _args, bytes[] calldata _updateData) external payable;

    /**
     * @notice Withdraw collateral without caring about fees.
     * @param _args WithdrawArgs struct containing withdraw data.
     */
    function emergencyWithdrawSCDP(SCDPWithdrawArgs memory _args, bytes[] calldata _updateData) external payable;

    /**
     * @notice Withdraws any pending fees for an account.
     * @param _account The account to withdraw fees for.
     * @param _collateralAsset The collateral asset to withdraw fees for.
     * @param _receiver Receiver of fees withdrawn, if 0 then the receiver is the account.
     * @return feeAmount The amount of fees withdrawn.
     */
    function claimFeesSCDP(
        address _account,
        address _collateralAsset,
        address _receiver
    ) external payable returns (uint256 feeAmount);

    /**
     * @notice Repay debt for no fees or slippage.
     * @notice Only uses swap deposits, if none available, reverts.
     * @param _args RepayArgs struct containing repay data.
     */
    function repaySCDP(SCDPRepayArgs calldata _args) external payable;

    /**
     * @notice Liquidate the collateral pool.
     * @notice Adjusts everyones deposits if swap deposits do not cover the seized amount.
     * @param _args LiquidationArgs struct containing liquidation data.
     */
    function liquidateSCDP(SCDPLiquidationArgs memory _args) external payable;

    /**
     * @dev Calculates the total value that is allowed to be liquidated from SCDP (if it is liquidatable)
     * @param _repayAssetAddr Address of Kresko Asset to repay
     * @param _seizeAssetAddr Address of Collateral to seize
     * @return MaxLiqInfo Calculated information about the maximum liquidation.
     */
    function getMaxLiqValueSCDP(address _repayAssetAddr, address _seizeAssetAddr) external view returns (MaxLiqInfo memory);

    function getLiquidatableSCDP() external view returns (bool);
}
