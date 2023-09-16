// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Arrays} from "libs/Arrays.sol";
import {Role} from "common/Types.sol";
import {Error} from "common/Errors.sol";

import {DSModifiers} from "diamond/Modifiers.sol";

import {IBurnHelperFacet} from "minter/interfaces/IBurnHelperFacet.sol";
import {MSModifiers} from "minter/Modifiers.sol";
import {MEvent} from "minter/Events.sol";
import {Action} from "minter/Types.sol";
import {ms, MinterState} from "minter/State.sol";
import {handleMinterCloseFee} from "minter/funcs/Fees.sol";

/**
 * @author Kresko
 * @title BurnHelperFacet
 * @notice Helper functions for reducing positions
 */

contract BurnHelperFacet is IBurnHelperFacet, DSModifiers, MSModifiers {
    using Arrays for address[];

    /// @inheritdoc IBurnHelperFacet
    function closeDebtPosition(
        address _account,
        address _kreskoAsset
    ) public nonReentrant kreskoAssetExists(_kreskoAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        MinterState storage s = ms();
        if (s.safetyStateSet) {
            super.ensureNotPaused(_kreskoAsset, Action.Repay);
        }

        // Get accounts principal debt
        uint256 principalDebt = s.accountDebtAmount(_account, _kreskoAsset);
        require(principalDebt != 0, Error.ZERO_BURN);

        // Charge the burn fee from collateral of _account
        handleMinterCloseFee(_account, _kreskoAsset, principalDebt);

        // Record the burn
        s.burn(_kreskoAsset, s.kreskoAssets[_kreskoAsset].anchor, principalDebt, _account);

        // All principal debt of asset is repayed remove it from minted assets array.
        s.mintedKreskoAssets[_account].removeAddress(_kreskoAsset, ms().accountMintIndex(_account, _kreskoAsset));

        emit MEvent.DebtPositionClosed(_account, _kreskoAsset, principalDebt);
    }

    /// @inheritdoc IBurnHelperFacet
    function closeAllDebtPositions(address _account) external onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        address[] memory mintedKreskoAssets = ms().accountDebtAssets(_account);
        for (uint256 i; i < mintedKreskoAssets.length; ) {
            closeDebtPosition(_account, mintedKreskoAssets[i]);
            unchecked {
                i++;
            }
        }
    }
}
