// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {Arrays} from "libs/Arrays.sol";
import {Role} from "common/Constants.sol";
import {CError} from "common/CError.sol";
import {CModifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset, Action} from "common/Types.sol";

import {DSModifiers} from "diamond/Modifiers.sol";
import {IBurnHelperFacet} from "./IBurnHelperFacet.sol";
import {MEvent} from "minter/Events.sol";
import {ms, MinterState} from "minter/State.sol";
import {MinterFee} from "minter/Types.sol";
import {handleMinterFee} from "minter/funcs/Fees.sol";

/**
 * @author Kresko
 * @title BurnHelperFacet
 * @notice Helper functions for reducing positions
 */

contract BurnHelperFacet is IBurnHelperFacet, DSModifiers, CModifiers {
    using Arrays for address[];

    /// @inheritdoc IBurnHelperFacet
    function closeDebtPosition(
        address _account,
        address _kreskoAsset
    ) public nonReentrant kreskoAssetExists(_kreskoAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        MinterState storage s = ms();
        if (cs().safetyStateSet) {
            super.ensureNotPaused(_kreskoAsset, Action.Repay);
        }
        Asset storage asset = cs().assets[_kreskoAsset];

        // Get accounts principal debt
        uint256 principalDebt = s.accountDebtAmount(_account, _kreskoAsset, asset);
        if (principalDebt == 0) revert CError.ZERO_BURN(_kreskoAsset);

        // Charge the burn fee from collateral of _account
        handleMinterFee(_account, asset, principalDebt, MinterFee.Close);

        // Record the burn
        s.burn(_kreskoAsset, asset.anchor, principalDebt, _account);

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
