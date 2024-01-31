// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {UncheckedWithdrawArgs, WithdrawArgs} from "common/Args.sol";

interface IMinterDepositWithdrawFacet {
    /**
     * @notice Deposits collateral into the protocol.
     * @param _account The user to deposit collateral for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _depositAmount The amount of the collateral asset to deposit.
     */
    function depositCollateral(address _account, address _collateralAsset, uint256 _depositAmount) external;

    /**
     * @notice Withdraws sender's collateral from the protocol.
     * @dev Requires that the post-withdrawal collateral value does not violate minimum collateral requirement.
     * @param _args WithdrawArgs
     * @param _updateData Price update data
     * assets array. Only needed if withdrawing the entire deposit of a particular collateral asset.
     */
    function withdrawCollateral(WithdrawArgs memory _args, bytes[] calldata _updateData) external payable;

    /**
     * @notice Withdraws sender's collateral from the protocol before checking minimum collateral ratio.
     * @dev Executes post-withdraw-callback triggering onUncheckedCollateralWithdraw on the caller
     * @dev Requires that the post-withdraw-callback collateral value does not violate minimum collateral requirement.
     * @param _args UncheckedWithdrawArgs
     * @param _updateData Price update data
     * assets array. Only needed if withdrawing the entire deposit of a particular collateral asset.
     */
    function withdrawCollateralUnchecked(UncheckedWithdrawArgs memory _args, bytes[] calldata _updateData) external payable;
}
