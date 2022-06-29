// SPDX-License-Identifier: MIT
/* solhint-disable no-inline-assembly */
/* solhint-disable avoid-low-level-calls */

pragma solidity >=0.8.14;

import "./DiamondState.sol";

// Storage position
bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("kresko.diamond.storage");

function ds() pure returns (DiamondState storage state) {
    bytes32 position = DIAMOND_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}
