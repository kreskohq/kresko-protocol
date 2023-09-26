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
    mapping(bytes32 assetId => mapping(OracleType oracleId => Oracle)) oracles;
    /// @notice asset -> action -> state
    mapping(address => mapping(Action => SafetyState)) safetyState;
    /// @notice The recipient of protocol fees.
    address feeRecipient;
    /// @notice The minimum USD value of an individual synthetic asset debt position.
    uint128 minDebtValue;
    /// @notice Flag tells if there is a need to perform safety checks on user actions
    bool safetyStateSet;
    /* -------------------------------------------------------------------------- */
    /*                             Oracle & Sequencer                             */
    /* -------------------------------------------------------------------------- */
    /// @notice The oracle deviation percentage between the main oracle and fallback oracle.
    uint248 oracleDeviationPct;
    /// @notice Offchain oracle decimals
    uint8 extOracleDecimals;
    /// @notice L2 sequencer feed address
    address sequencerUptimeFeed;
    /// @notice grace period of sequencer in seconds
    uint48 sequencerGracePeriodTime;
    /// @notice timeout for oracle in seconds
    uint48 oracleTimeout;
    /* -------------------------------------------------------------------------- */
    /*                                 Reentrancy                                 */
    /* -------------------------------------------------------------------------- */
    uint256 entered;
    /* -------------------------------------------------------------------------- */
    /*                               Access Control                               */
    /* -------------------------------------------------------------------------- */
    mapping(bytes32 => RoleData) _roles;
    mapping(bytes32 => EnumerableSet.AddressSet) _roleMembers;
    /* -------------------------------------------------------------------------- */
    /*                                   Gating                                   */
    /* -------------------------------------------------------------------------- */
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
    bytes32 position = COMMON_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}
