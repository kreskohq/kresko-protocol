// SPDX-License-Identifier: BUSL-1.1
/* solhint-disable no-inline-assembly */
/* solhint-disable avoid-low-level-calls */
/* solhint-disable func-visibility */

pragma solidity >=0.8.19;

import {OracleState} from "./OracleState.sol";

// Storage position
bytes32 constant ORACLE_STORAGE_POSITION = keccak256("kresko.oracle.storage");

function os() pure returns (OracleState storage state) {
    bytes32 position = ORACLE_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}
