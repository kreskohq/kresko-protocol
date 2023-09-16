// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Error} from "common/Errors.sol";
import {Role} from "common/Types.sol";

import {DSModifiers} from "diamond/Modifiers.sol";

import {ISafetyCouncilFacet} from "minter/interfaces/ISafetyCouncilFacet.sol";
import {MEvent} from "minter/Events.sol";
import {Action, SafetyState, Pause} from "minter/Types.sol";
import {MSModifiers} from "minter/Modifiers.sol";
import {ms} from "minter/State.sol";

/* solhint-disable not-rely-on-time */

/**
 * @author Kresko
 * @title SafetyCouncilFacet - protocol safety controls
 * @notice `Role.SAFETY_COUNCIL` must be a multisig.
 */
contract SafetyCouncilFacet is MSModifiers, DSModifiers, ISafetyCouncilFacet {
    /// @inheritdoc ISafetyCouncilFacet
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
            ms().safetyState[asset][_action].pause = Pause(
                willPause,
                block.timestamp,
                _withDuration ? block.timestamp + _duration : 0
            );
            // Emit the actions taken
            emit MEvent.SafetyStateChange(_action, asset, willPause ? "paused" : "unpaused");
        }
    }

    /// @inheritdoc ISafetyCouncilFacet
    function setSafetyStateSet(bool val) external override onlyRole(Role.SAFETY_COUNCIL) {
        ms().safetyStateSet = val;
    }

    /// @inheritdoc ISafetyCouncilFacet
    function safetyStateSet() external view override returns (bool) {
        return ms().safetyStateSet;
    }

    /// @inheritdoc ISafetyCouncilFacet
    function safetyStateFor(address _asset, Action _action) external view override returns (SafetyState memory) {
        return ms().safetyState[_asset][_action];
    }

    /// @inheritdoc ISafetyCouncilFacet
    function assetActionPaused(Action _action, address _asset) external view returns (bool) {
        return ms().safetyState[_asset][_action].pause.enabled;
    }
}
