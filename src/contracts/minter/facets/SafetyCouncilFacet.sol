// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "../state/Structs.sol";
import "../../shared/Errors.sol";
import {AccessControl, Role} from "../../shared/AccessControl.sol";
import {DiamondModifiers, MinterModifiers} from "../../shared/Modifiers.sol";
import {ms, MinterEvent} from "../MinterStorage.sol";

/**
 * @title Critical safety controls
 * @author Kresko
 * @notice `Role.SAFETY_COUNCIL` must be a multisig with ERC165
 */
contract SafetyCouncilFacet is MinterModifiers, DiamondModifiers {
    function toggleAssetsPaused(
        address[] calldata _assets,
        Action _action,
        bool _withDuration,
        uint256 _duration
    ) external onlyRole(Role.SAFETY_COUNCIL) {
        bool enabled;
        /// @dev loop through `_assets` - be it krAsset or collateral
        for (uint256 i; i < _assets.length; i++) {
            address asset = _assets[i];
            // Revert if invalid address is supplied
            require(ms().collateralAssets[asset].exists, Error.COLLATERAL_DOESNT_EXIST);
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
}
