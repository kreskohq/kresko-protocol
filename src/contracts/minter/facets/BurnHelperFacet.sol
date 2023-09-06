// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Arrays} from "common/libs/Arrays.sol";
import {Role} from "common/libs/Authorization.sol";
import {Error} from "common/Errors.sol";
import {MinterEvent} from "common/Events.sol";

import {Mega, IBurnHelperFacet} from "../interfaces/IBurnHelperFacet.sol";
import {DiamondModifiers} from "diamond/libs/LibDiamond.sol";
import {ms, Action, MinterState, MinterModifiers} from "../libs/LibMinter.sol";

/**
 * @author Kresko
 * @title BurnHelperFacet
 * @notice Helper functions for reducing positions
 */
contract BurnHelperFacet is IBurnHelperFacet, DiamondModifiers, MinterModifiers {
    using Arrays for address[];

    /// @inheritdoc IBurnHelperFacet
    function closeKrAssetDebtPosition(
        address _account,
        address _kreskoAsset
    ) public nonReentrant kreskoAssetExists(_kreskoAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        MinterState storage s = ms();
        if (s.safetyStateSet) {
            super.ensureNotPaused(_kreskoAsset, Action.Repay);
        }

        // Get accounts principal debt
        uint256 principalDebt = s.getKreskoAssetDebtPrincipal(_account, _kreskoAsset);
        require(principalDebt != 0, Error.ZERO_BURN);

        // Charge the burn fee from collateral of _account
        s.chargeCloseFee(_account, _kreskoAsset, principalDebt);

        // Record the burn
        s.burn(_kreskoAsset, s.kreskoAssets[_kreskoAsset].anchor, principalDebt, _account);

        // All principal debt of asset is repayed remove it from minted assets array.
        s.mintedKreskoAssets[_account].removeAddress(
            _kreskoAsset,
            ms().getMintedKreskoAssetsIndex(_account, _kreskoAsset)
        );

        emit MinterEvent.DebtPositionClosed(_account, _kreskoAsset, principalDebt);
    }

    /// @inheritdoc IBurnHelperFacet
    function batchCloseKrAssetDebtPositions(
        address _account
    ) external onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        address[] memory mintedKreskoAssets = ms().getMintedKreskoAssets(_account);
        for (uint256 i; i < mintedKreskoAssets.length; ) {
            closeKrAssetDebtPosition(_account, mintedKreskoAssets[i]);
            unchecked {
                i++;
            }
        }
    }
}
