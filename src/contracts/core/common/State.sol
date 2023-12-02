// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {EnumerableSet} from "@oz/utils/structs/EnumerableSet.sol";
import {LibModifiers} from "common/Modifiers.sol";
import {Enums} from "common/Constants.sol";
import {Asset, SafetyState, RoleData, Oracle} from "common/Types.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";

using LibModifiers for CommonState global;

struct CommonState {
    /* -------------------------------------------------------------------------- */
    /*                                    Core                                    */
    /* -------------------------------------------------------------------------- */
    /// @notice asset address -> asset data
    mapping(address => Asset) assets;
    /// @notice asset -> oracle type -> oracle
    mapping(bytes32 => mapping(Enums.OracleType => Oracle)) oracles;
    /// @notice asset -> action -> state
    mapping(address => mapping(Enums.Action => SafetyState)) safetyState;
    /// @notice The recipient of protocol fees.
    address feeRecipient;
    /* -------------------------------------------------------------------------- */
    /*                             Oracle & Sequencer                             */
    /* -------------------------------------------------------------------------- */
    /// @notice L2 sequencer feed address
    address sequencerUptimeFeed;
    /// @notice grace period of sequencer in seconds
    uint32 sequencerGracePeriodTime;
    /// @notice Time in seconds for a feed to be considered stale
    uint32 staleTime;
    /// @notice The max deviation percentage between primary and secondary price.
    uint16 maxPriceDeviationPct;
    /// @notice Offchain oracle decimals
    uint8 oracleDecimals;
    /// @notice Flag tells if there is a need to perform safety checks on user actions
    bool safetyStateSet;
    /* -------------------------------------------------------------------------- */
    /*                                 Reentrancy                                 */
    /* -------------------------------------------------------------------------- */
    uint256 entered;
    /* -------------------------------------------------------------------------- */
    /*                               Access Control                               */
    /* -------------------------------------------------------------------------- */
    mapping(bytes32 role => RoleData data) _roles;
    mapping(bytes32 role => EnumerableSet.AddressSet member) _roleMembers;
}

/* -------------------------------------------------------------------------- */
/*                                   Getter                                   */
/* -------------------------------------------------------------------------- */

// Storage position
bytes32 constant COMMON_STORAGE_POSITION = keccak256("kresko.common.storage");

// Gating
bytes32 constant GATING_MANAGER_POSITION = keccak256("kresko.gating.storage");
struct GatingState {
    IGatingManager manager;
}

function gm() pure returns (GatingState storage state) {
    bytes32 position = GATING_MANAGER_POSITION;
    assembly {
        state.slot := position
    }
}

function cs() pure returns (CommonState storage state) {
    bytes32 position = bytes32(COMMON_STORAGE_POSITION);
    assembly {
        state.slot := position
    }
}
