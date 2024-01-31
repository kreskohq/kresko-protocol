// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {Arrays} from "libs/Arrays.sol";
import {Role, Enums} from "common/Constants.sol";
import {Errors} from "common/Errors.sol";
import {Modifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";

import {DSModifiers} from "diamond/DSModifiers.sol";
import {MEvent} from "minter/MEvent.sol";
import {ms, MinterState} from "minter/MState.sol";
import {handleMinterFee} from "minter/funcs/MFees.sol";
import {IMinterBurnHelperFacet} from "periphery/interfaces/IMinterBurnHelperFacet.sol";

/**
 * @author Kresko
 * @title BurnHelperFacet
 * @notice Helper functions for reducing positions in the Kresko Minter.
 */

contract MinterBurnHelperFacet is IMinterBurnHelperFacet, DSModifiers, Modifiers {
    using Arrays for address[];

    /// @inheritdoc IMinterBurnHelperFacet
    function closeDebtPosition(
        address _account,
        address _krAsset,
        bytes[] calldata _updateData
    ) public payable nonReentrant onlyRoleIf(_account != msg.sender, Role.MANAGER) usePyth(_updateData) {
        Asset storage asset = cs().onlyMinterMintable(_krAsset, Enums.Action.Repay);

        MinterState storage s = ms();
        // Get accounts principal debt
        uint256 principalDebt = s.accountDebtAmount(_account, _krAsset, asset);
        if (principalDebt == 0) revert Errors.ZERO_DEBT(Errors.id(_krAsset));

        // Charge the burn fee from collateral of _account
        handleMinterFee(asset, _account, principalDebt, Enums.MinterFee.Close);

        // Record the burn
        s.burn(_krAsset, asset.anchor, principalDebt, _account);

        // All principal debt of asset is repayed remove it from minted assets array.
        s.mintedKreskoAssets[_account].removeAddress(_krAsset, ms().accountMintIndex(_account, _krAsset));

        emit MEvent.DebtPositionClosed(_account, _krAsset, principalDebt);
    }

    /// @inheritdoc IMinterBurnHelperFacet
    function closeAllDebtPositions(
        address _account,
        bytes[] calldata _updateData
    ) external payable onlyRoleIf(_account != msg.sender, Role.MANAGER) usePyth(_updateData) {
        address[] memory mintedKreskoAssets = ms().accountDebtAssets(_account);
        for (uint256 i; i < mintedKreskoAssets.length; ) {
            closeDebtPosition(_account, mintedKreskoAssets[i], _updateData);
            unchecked {
                i++;
            }
        }
    }
}
