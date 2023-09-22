// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

import {Oracle, OracleType} from "./Types.sol";

// Storage position
bytes32 constant ORACLE_STORAGE_POSITION = keccak256("kresko.oracle.storage");

struct OracleState {
    mapping(bytes32 assetId => mapping(OracleType oracleId => Oracle)) oracles;
}

function os() pure returns (OracleState storage state) {
    bytes32 position = ORACLE_STORAGE_POSITION;

    assembly {
        state.slot := position
    }
}
