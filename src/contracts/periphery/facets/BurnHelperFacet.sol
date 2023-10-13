// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {Arrays} from "libs/Arrays.sol";
import {Role} from "common/Constants.sol";
import {Errors} from "common/Errors.sol";
import {Modifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset, Action} from "common/Types.sol";

import {DSModifiers} from "diamond/DSModifiers.sol";
import {IMinterBurnHelperFacet} from "./IMinterBurnHelperFacet.sol";
import {MEvent} from "minter/MEvent.sol";
import {ms, MinterState} from "minter/MState.sol";
import {MinterFee} from "minter/MTypes.sol";
import {handleMinterFee} from "minter/funcs/MFees.sol";

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
        address _kreskoAsset
    ) public nonReentrant kreskoAssetExists(_kreskoAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        Asset storage asset = cs().onlyMinterMintable(_assetAddr, Action.Repay);

        MinterState storage s = ms();
        // Get accounts principal debt
        uint256 principalDebt = s.accountDebtAmount(_account, _kreskoAsset, asset);
        if (principalDebt == 0) revert Errors.ZERO_DEBT(_kreskoAsset);

        // Charge the burn fee from collateral of _account
        handleMinterFee(asset, _account, principalDebt, MinterFee.Close);

        // Record the burn
        s.burn(_kreskoAsset, asset.anchor, principalDebt, _account);

        // All principal debt of asset is repayed remove it from minted assets array.
        s.mintedKreskoAssets[_account].removeAddress(_kreskoAsset, ms().accountMintIndex(_account, _kreskoAsset));

        emit MEvent.DebtPositionClosed(_account, _kreskoAsset, principalDebt);
    }

    /// @inheritdoc IMinterBurnHelperFacet
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
