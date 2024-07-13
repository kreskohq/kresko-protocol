// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {IERC20} from "kresko-lib/token/IERC20.sol";
import {SafeTransfer} from "kresko-lib/token/SafeTransfer.sol";
import {Role, Enums} from "common/Constants.sol";
import {Modifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";

import {IMinterDepositWithdrawFacet} from "minter/interfaces/IMinterDepositWithdrawFacet.sol";
import {ICollateralReceiver} from "minter/interfaces/ICollateralReceiver.sol";
import {ms} from "minter/MState.sol";
import {UncheckedWithdrawArgs, WithdrawArgs} from "common/Args.sol";

/**
 * @author Kresko
 * @title MinterDepositWithdrawFacet
 * @notice Core collateral deposit and withdrawal functionality for Kresko Minter.
 */
contract MinterDepositWithdrawFacet is Modifiers, IMinterDepositWithdrawFacet {
    using SafeTransfer for IERC20;

    /* -------------------------------------------------------------------------- */
    /*                                 Collateral                                 */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IMinterDepositWithdrawFacet
    function depositCollateral(
        address _account,
        address _collateralAsset,
        uint256 _depositAmount
    ) external payable nonReentrant {
        Asset storage asset = cs().onlyMinterCollateral(_collateralAsset, Enums.Action.Deposit);
        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20(_collateralAsset).safeTransferFrom(msg.sender, address(this), _depositAmount);
        // Record the collateral deposit.
        ms().handleDeposit(asset, _account, _collateralAsset, _depositAmount);
    }

    /// @inheritdoc IMinterDepositWithdrawFacet
    function withdrawCollateral(
        WithdrawArgs memory _args,
        bytes[] calldata _updateData
    ) external payable nonReentrant onlyRoleIf(_args.account != msg.sender, Role.MANAGER) usePyth(_updateData) {
        Asset storage asset = cs().onlyMinterCollateral(_args.asset, Enums.Action.Withdraw);
        uint256 collateralAmount = ms().accountCollateralAmount(_args.account, _args.asset, asset);

        // Try to send full deposits when overflowing
        _args.amount = (_args.amount > collateralAmount ? collateralAmount : _args.amount);

        ms().handleWithdrawal(asset, _args.account, _args.asset, _args.amount, collateralAmount, _args.collateralIndex);

        IERC20(_args.asset).safeTransfer(_args.receiver == address(0) ? _args.account : _args.receiver, _args.amount);
    }

    /// @inheritdoc IMinterDepositWithdrawFacet
    function withdrawCollateralUnchecked(
        UncheckedWithdrawArgs memory _args,
        bytes[] calldata _updateData
    ) external payable onlyRole(Role.MANAGER) usePyth(_updateData) {
        Asset storage asset = cs().onlyMinterCollateral(_args.asset, Enums.Action.Withdraw);
        uint256 collateralDeposits = ms().accountCollateralAmount(_args.account, _args.asset, asset);

        // Try to send full deposits when overflowing
        _args.amount = (_args.amount > collateralDeposits ? collateralDeposits : _args.amount);

        // perform unchecked withdrawal
        // Emits MinterEvent.UncheckedCollateralWithdrawn
        ms().handleUncheckedWithdrawal(
            asset,
            _args.account,
            _args.asset,
            _args.amount,
            collateralDeposits,
            _args.collateralIndex
        );

        // transfer the withdrawn asset to the caller
        IERC20(_args.asset).safeTransfer(msg.sender, _args.amount);

        // Executes the callback on the caller after sending them the withdrawn collateral
        ICollateralReceiver(msg.sender).onUncheckedCollateralWithdraw(
            _args.account,
            _args.asset,
            _args.amount,
            _args.collateralIndex,
            _args.userData
        );

        /*
         Perform the MCR check after the callback has been executed
         Ensures accountCollateralValue remains over accountMinColateralValueAtRatio(MCR)
        */
        ms().checkAccountCollateral(_args.account);
    }
}
