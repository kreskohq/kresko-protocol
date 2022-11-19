// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {Arrays} from "../../libs/Arrays.sol";
import {Error} from "../../libs/Errors.sol";
import {Role} from "../../libs/Authorization.sol";
import {MinterEvent} from "../../libs/Events.sol";

import {DiamondModifiers, MinterModifiers} from "../../shared/Modifiers.sol";
import {Action, FixedPoint} from "../MinterTypes.sol";
import {ms, MinterState} from "../MinterStorage.sol";
import {irs} from "../InterestRateState.sol";

/**
 * @author Kresko
 * @title BurnHelperFacet
 * @notice Helper functions for reducing positions
 */
contract BurnHelperFacet is DiamondModifiers, MinterModifiers {
    using FixedPoint for FixedPoint.Unsigned;
    using Arrays for address[];

    /**
     * @notice Burns all Kresko asset debt and repays interest.
     * @notice Account must have enough of krAsset to burn it and ennough KISS to cover interest
     * @param _account The address to close the position for
     * @param _kreskoAsset The address of the Kresko asset.
     */
    function closeKrAssetDebtPosition(address _account, address _kreskoAsset)
        public
        nonReentrant
        kreskoAssetExists(_kreskoAsset)
        onlyRoleIf(_account != msg.sender, Role.MANAGER)
    {
        MinterState storage s = ms();
        if (s.safetyStateSet) {
            ensureNotPaused(_kreskoAsset, Action.Repay);
        }

        // Get accounts principal debt
        uint256 burnAmount = s.getKreskoAssetDebtPrincipal(_account, _kreskoAsset);
        require(burnAmount != 0, Error.ZERO_BURN);

        // If sender repays all principal debt of asset with no stability rate, remove it from minted assets array.
        // For assets with stability rate the revomal is done when repaying interest

        // Charge the burn fee from collateral of _account
        s.chargeCloseFee(_account, _kreskoAsset, burnAmount);

        // Record the burn
        s.repay(_kreskoAsset, s.kreskoAssets[_kreskoAsset].anchor, burnAmount, _account);
        uint256 kissRepayAmount = ms().repayFullStabilityRateInterest(_account, _kreskoAsset);

        // If sender repays all principal debt of asset with no stability rate, remove it from minted assets array.
        // For assets with stability rate the revomal is done when repaying interest
        if (irs().srAssets[_kreskoAsset].asset == address(0)) {
            s.mintedKreskoAssets[_account].removeAddress(
                _kreskoAsset,
                ms().getMintedKreskoAssetsIndex(_account, _kreskoAsset)
            );
        }
        // Emit logs
        emit MinterEvent.DebtPositionClosed(_account, _kreskoAsset, burnAmount, kissRepayAmount);
    }

    /**
     * @notice Attempts to close all debt positions and interest
     * @notice Account must have enough of krAsset to burn it and ennough KISS to cover interest
     * @param _account The address to close the positions for
     */
    function batchCloseKrAssetDebtPositions(address _account)
        external
        onlyRoleIf(_account != msg.sender, Role.MANAGER)
    {
        address[] memory mintedKreskoAssets = ms().getMintedKreskoAssets(_account);
        for (uint256 i; i < mintedKreskoAssets.length; i++) {
            closeKrAssetDebtPosition(_account, mintedKreskoAssets[i]);
        }
    }

    /// @dev Simple check for the enabled flag
    function ensureNotPaused(address _asset, Action _action) internal view {
        require(!ms().safetyState[_asset][_action].pause.enabled, Error.ACTION_PAUSED_FOR_ASSET);
    }
}
