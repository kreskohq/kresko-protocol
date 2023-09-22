// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {Role} from "common/Types.sol";

import {DSModifiers} from "diamond/Modifiers.sol";

import {IDepositWithdrawFacet} from "minter/interfaces/IDepositWithdrawFacet.sol";
import {ICollateralReceiver} from "minter/interfaces/ICollateralReceiver.sol";
import {ms} from "minter/State.sol";
import {Action} from "minter/Types.sol";
import {MSModifiers} from "minter/Modifiers.sol";

/**
 * @author Kresko
 * @title DepositWithdrawFacet
 * @notice Main end-user functionality concerning collateral asset deposits and withdrawals within the Kresko protocol
 */

contract DepositWithdrawFacet is DSModifiers, MSModifiers, IDepositWithdrawFacet {
    using SafeERC20Permit for IERC20Permit;

    /* -------------------------------------------------------------------------- */
    /*                                 Collateral                                 */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IDepositWithdrawFacet
    function depositCollateral(
        address _account,
        address _collateralAsset,
        uint256 _depositAmount
    ) external nonReentrant collateralAssetExists(_collateralAsset) {
        if (ms().safetyStateSet) {
            super.ensureNotPaused(_collateralAsset, Action.Deposit);
        }

        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20Permit(_collateralAsset).safeTransferFrom(msg.sender, address(this), _depositAmount);

        // Record the collateral deposit.
        ms().handleDeposit(_account, _collateralAsset, _depositAmount);
    }

    /// @inheritdoc IDepositWithdrawFacet
    function withdrawCollateral(
        address _account,
        address _collateralAsset,
        uint256 _withdrawAmount,
        uint256 _depositedCollateralAssetIndex
    ) external nonReentrant collateralAssetExists(_collateralAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        if (ms().safetyStateSet) {
            ensureNotPaused(_collateralAsset, Action.Withdraw);
        }

        uint256 collateralAmount = ms().accountCollateralAmount(_account, _collateralAsset);
        _withdrawAmount = (_withdrawAmount > collateralAmount ? collateralAmount : _withdrawAmount);

        ms().handleWithdrawal(_account, _collateralAsset, _withdrawAmount, collateralAmount, _depositedCollateralAssetIndex);

        IERC20Permit(_collateralAsset).safeTransfer(_account, _withdrawAmount);
    }

    /// @inheritdoc IDepositWithdrawFacet
    function withdrawCollateralUnchecked(
        address _account,
        address _collateralAsset,
        uint256 _withdrawAmount,
        uint256 _depositedCollateralAssetIndex,
        bytes memory _userData
    ) external collateralAssetExists(_collateralAsset) onlyRole(Role.MANAGER) {
        if (ms().safetyStateSet) {
            ensureNotPaused(_collateralAsset, Action.Withdraw);
        }

        uint256 collateralDeposits = ms().accountCollateralAmount(_account, _collateralAsset);
        _withdrawAmount = (_withdrawAmount > collateralDeposits ? collateralDeposits : _withdrawAmount);

        // perform unchecked withdrawal
        ms().recordWithdrawal(_account, _collateralAsset, _withdrawAmount, collateralDeposits, _depositedCollateralAssetIndex);

        // transfer the withdrawn asset to the caller
        IERC20Permit(_collateralAsset).safeTransfer(msg.sender, _withdrawAmount);

        // Executes the callback on the caller after sending them the withdrawn collateral
        ICollateralReceiver(msg.sender).onUncheckedCollateralWithdraw(
            _account,
            _collateralAsset,
            _withdrawAmount,
            _depositedCollateralAssetIndex,
            _userData
        );

        /*
         Perform the MCR check after the callback has been executed
         Ensures accountCollateralValue remains over accountMinColateralValueAtRatio(MCR)
         Emits MinterEvent.UncheckedCollateralWithdrawn
         _withdrawAmount is 0 since deposits reduced in recordCollateralWithdrawal
        */
        ms().verifyAccountCollateral(_account, _collateralAsset, 0);
    }
}
