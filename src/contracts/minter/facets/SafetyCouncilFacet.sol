// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {ISafetyCouncil} from "../interfaces/ISafetyCouncil.sol";

import {Error} from "../../libs/Errors.sol";
import {MinterEvent} from "../../libs/Events.sol";
import {Authorization, Role} from "../../libs/Authorization.sol";
import {DiamondModifiers, MinterModifiers} from "../../shared/Modifiers.sol";

import {Action, SafetyState, Pause} from "../MinterTypes.sol";
import {ms} from "../MinterStorage.sol";

/* solhint-disable not-rely-on-time */

/**
 * @title Protocol safety controls
 * @author Kresko
 * @notice `Role.SAFETY_COUNCIL` must be a multisig.
 */
contract SafetyCouncilFacet is MinterModifiers, DiamondModifiers, ISafetyCouncil {
    /**
     * @dev Toggle paused-state of assets in a per-action basis
     *
     * @notice These functions are only callable by a multisig quorum.
     * @param _assets list of addresses of krAssets and/or collateral assets
     * @param _action One of possible user actions:
     *  Deposit = 0
     *  Withdraw = 1,
     *  Repay = 2,
     *  Borrow = 3,
     *  Liquidate = 4
     * @param _withDuration Set a duration for this pause - @todo: implement it if required
     * @param _duration Duration for the pause if `_withDuration` is true
     */
    function toggleAssetsPaused(
        address[] calldata _assets,
        Action _action,
        bool _withDuration,
        uint256 _duration
    ) external override onlyRole(Role.SAFETY_COUNCIL) {
        bool enabled;
        /// @dev loop through `_assets` - be it krAsset or collateral
        for (uint256 i; i < _assets.length; i++) {
            address asset = _assets[i];
            // Revert if invalid address is supplied
            require(
                ms().collateralAssets[asset].exists || ms().kreskoAssets[asset].exists,
                Error.INVALID_ASSET_SUPPLIED
            );
            // Get the safety state
            SafetyState memory safetyState = ms().safetyState[asset][_action];
            // Flip the previous value
            bool willPause = !safetyState.pause.enabled;
            // Set a global flag in case any asset gets set to true
            if (willPause) {
                enabled = true;
            }
            // Update the state for this asset
            ms().safetyState[asset][Action.Deposit].pause = Pause(
                willPause,
                block.timestamp,
                _withDuration ? block.timestamp + _duration : 0
            );
            // Emit the actions taken
            emit MinterEvent.SafetyStateChange(_action, asset, enabled ? "paused" : "unpaused");
        }
    }

    /**
     * @notice For external checks if a safety state has been set for any asset
     */
    function safetyStateSet() external view override returns (bool) {
        return ms().safetyStateSet;
    }

    /**
     * @notice View the state of safety measures for an asset on a per-action basis
     * @param _asset krAsset / collateral asset
     * @param _action One of possible user actions:
     *
     *  Deposit = 0
     *  Withdraw = 1,
     *  Repay = 2,
     *  Borrow = 3,
     *  Liquidate = 4
     */
    function safetyStateFor(address _asset, Action _action) external view override returns (SafetyState memory) {
        return ms().safetyState[_asset][_action];
    }

    /**
     * @notice Check if `_asset` has a pause enabled for `_action`
     * @param _action enum `Action`
     *  Deposit = 0
     *  Withdraw = 1,
     *  Repay = 2,
     *  Borrow = 3,
     *  Liquidate = 4
     * @return true if `_action` is paused
     */
    function assetActionPaused(Action _action, address _asset) external view returns (bool) {
        return ms().safetyState[_asset][_action].pause.enabled;
    }
}
