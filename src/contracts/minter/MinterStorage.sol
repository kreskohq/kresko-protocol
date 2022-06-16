// SPDX-License-Identifier: MIT
/* solhint-disable no-inline-assembly */
/* solhint-disable avoid-low-level-calls */

pragma solidity 0.8.14;

import "./state/Functions.sol";

// Storage position
bytes32 constant MINTER_STORAGE_POSITION = keccak256("kresko.minter.storage");

function ms() pure returns (MinterState storage state) {
    bytes32 position = MINTER_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}
