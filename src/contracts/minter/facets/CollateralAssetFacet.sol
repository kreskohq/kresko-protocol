// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {ICollateralAssetFacet} from "../interfaces/ICollateralAssetFacet.sol";

import {Error} from "../../libs/Errors.sol";
import {Role} from "../../libs/Authorization.sol";

import {SafeERC20Upgradeable, IERC20Upgradeable} from "../../shared/SafeERC20Upgradeable.sol";
import {DiamondModifiers, MinterModifiers} from "../../shared/Modifiers.sol";
import {Action, FixedPoint, KrAsset} from "../MinterTypes.sol";
import {ms, MinterState} from "../MinterStorage.sol";
import {irs} from "../InterestRateState.sol";

/**
 * @author Kresko
 * @title CollateralAssetFacet
 * @notice Main end-user functionality concerning collateral assets within the Kresko protocol
 */
contract CollateralAssetFacet is DiamondModifiers, MinterModifiers, ICollateralAssetFacet {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using FixedPoint for FixedPoint.Unsigned;

    /* -------------------------------------------------------------------------- */
    /*                                 Collateral                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Deposits collateral into the protocol.
     * @param _account The user to deposit collateral for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _amount The amount of the collateral asset to deposit.
     */
    function depositCollateral(
        address _account,
        address _collateralAsset,
        uint256 _amount
    ) external nonReentrant collateralAssetExists(_collateralAsset) {
        if (ms().safetyStateSet) {
            ensureNotPaused(_collateralAsset, Action.Deposit);
        }

        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20Upgradeable(_collateralAsset).safeTransferFrom(msg.sender, address(this), _amount);

        // Record the collateral deposit.
        ms().recordCollateralDeposit(_account, _collateralAsset, _amount);
    }

    /**
     * @notice Withdraws sender's collateral from the protocol.
     * @dev Requires the post-withdrawal collateral value to violate minimum collateral requirement.
     * @param _account The address to withdraw assets for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _amount The amount of the collateral asset to withdraw.
     * @param _depositedCollateralAssetIndex The index of the collateral asset in the sender's deposited collateral
     * assets array. Only needed if withdrawing the entire deposit of a particular collateral asset.
     */
    function withdrawCollateral(
        address _account,
        address _collateralAsset,
        uint256 _amount,
        uint256 _depositedCollateralAssetIndex
    ) external nonReentrant collateralAssetExists(_collateralAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        if (ms().safetyStateSet) {
            ensureNotPaused(_collateralAsset, Action.Withdraw);
        }

        uint256 depositAmount = ms().getCollateralDeposits(_account, _collateralAsset);
        _amount = (_amount > depositAmount ? depositAmount : _amount);
        ms().verifyAndRecordCollateralWithdrawal(
            _account,
            _collateralAsset,
            _amount,
            depositAmount,
            _depositedCollateralAssetIndex
        );

        IERC20Upgradeable(_collateralAsset).safeTransfer(_account, _amount);
    }

    /// @dev Simple check for the enabled flag
    function ensureNotPaused(address _asset, Action _action) internal view {
        require(!ms().safetyState[_asset][_action].pause.enabled, Error.ACTION_PAUSED_FOR_ASSET);
    }
}
