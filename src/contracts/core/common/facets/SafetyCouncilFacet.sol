// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {CError} from "common/CError.sol";
import {Role} from "common/Constants.sol";
import {Action, SafetyState, Pause, Asset} from "common/Types.sol";
import {CModifiers} from "common/Modifiers.sol";
import {ISafetyCouncilFacet} from "common/interfaces/ISafetyCouncilFacet.sol";
import {cs} from "common/State.sol";
import {MEvent} from "minter/Events.sol";

/* solhint-disable not-rely-on-time */

/**
 * @author Kresko
 * @title SafetyCouncilFacet - protocol safety controls
 * @notice `Role.SAFETY_COUNCIL` must be a multisig.
 */
contract SafetyCouncilFacet is CModifiers, ISafetyCouncilFacet {
    /// @inheritdoc ISafetyCouncilFacet
    function toggleAssetsPaused(
        address[] calldata _assets,
        Action _action,
        bool _withDuration,
        uint256 _duration
    ) external override onlyRole(Role.SAFETY_COUNCIL) {
        /// @dev loop through `_assets` - be it krAsset or collateral
        for (uint256 i; i < _assets.length; i++) {
            address assetAddr = _assets[i];
            // Revert if invalid address is supplied
            Asset memory asset = cs().assets[assetAddr];
            if (!asset.isCollateral && !asset.isKrAsset && !asset.isSCDPDepositAsset && !asset.isSCDPKrAsset) {
                revert CError.INVALID_ASSET(assetAddr);
            }
            // Get the safety state
            SafetyState memory safetyState = cs().safetyState[assetAddr][_action];
            // Flip the previous value
            bool willPause = !safetyState.pause.enabled;

            if (willPause) {
                cs().safetyStateSet = true;
            }

            // Update the state for this asset
            cs().safetyState[assetAddr][_action].pause = Pause(
                willPause,
                block.timestamp,
                _withDuration ? block.timestamp + _duration : 0
            );
            // Emit the actions taken
            emit MEvent.SafetyStateChange(_action, assetAddr, willPause ? "paused" : "unpaused");
        }
    }

    /// @inheritdoc ISafetyCouncilFacet
    function setSafetyStateSet(bool val) external override onlyRole(Role.SAFETY_COUNCIL) {
        cs().safetyStateSet = val;
    }

    /// @inheritdoc ISafetyCouncilFacet
    function safetyStateSet() external view override returns (bool) {
        return cs().safetyStateSet;
    }

    /// @inheritdoc ISafetyCouncilFacet
    function safetyStateFor(address _asset, Action _action) external view override returns (SafetyState memory) {
        return cs().safetyState[_asset][_action];
    }

    /// @inheritdoc ISafetyCouncilFacet
    function assetActionPaused(Action _action, address _asset) external view returns (bool) {
        return cs().safetyState[_asset][_action].pause.enabled;
    }
}
