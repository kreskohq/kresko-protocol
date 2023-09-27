// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
import {EnumerableSet} from "libs/EnumerableSet.sol";
import {Asset, SafetyState, RoleData, Action, Oracle, OracleType} from "common/Types.sol";

struct CommonState {
    /* -------------------------------------------------------------------------- */
    /*                                    Core                                    */
    /* -------------------------------------------------------------------------- */
    /// @notice asset address -> asset data
    mapping(address => Asset) assets;
    /// @notice asset -> oracle type -> oracle
    mapping(bytes32 => mapping(OracleType => Oracle)) oracles;
    /// @notice asset -> action -> state
    mapping(address => mapping(Action => SafetyState)) safetyState;
    /// @notice The recipient of protocol fees.
    address feeRecipient;
    /// @notice The minimum USD value of an individual synthetic asset debt position.
    uint96 minDebtValue;
    /* -------------------------------------------------------------------------- */
    /*                             Oracle & Sequencer                             */
    /* -------------------------------------------------------------------------- */
    /// @notice L2 sequencer feed address
    address sequencerUptimeFeed;
    /// @notice grace period of sequencer in seconds
    uint32 sequencerGracePeriodTime;
    /// @notice timeout for oracle in seconds
    uint32 oracleTimeout;
    /// @notice The oracle deviation percentage between the main oracle and fallback oracle.
    uint16 oracleDeviationPct;
    /// @notice Offchain oracle decimals
    uint8 extOracleDecimals;
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

struct GatingState {
    address kreskian;
    address questForKresk;
    uint8 phase;
}

/* -------------------------------------------------------------------------- */
/*                                   Getter                                   */
/* -------------------------------------------------------------------------- */

// Storage position
bytes32 constant COMMON_STORAGE_POSITION = keccak256("kresko.common.storage");

function cs() pure returns (CommonState storage state) {
    bytes32 position = bytes32(COMMON_STORAGE_POSITION);
    assembly {
        state.slot := position
    }
}

bytes32 constant GATING_STORAGE_POSITION = keccak256("kresko.gating.storage");

function gs() pure returns (GatingState storage state) {
    bytes32 position = bytes32(GATING_STORAGE_POSITION);
    assembly {
        state.slot := position
    }
}
