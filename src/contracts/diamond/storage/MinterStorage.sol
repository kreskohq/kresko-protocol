// SPDX-License-Identifier: MIT
/* solhint-disable no-inline-assembly */
/* solhint-disable state-visibility */

pragma solidity 0.8.13;

import {LibMeta} from "../libraries/LibMeta.sol";
import {MinterState} from "./MinterStructs.sol";
import "../Errors.sol";

bytes32 constant MINTER_STORAGE_POSITION = keccak256("kresko.minter.storage");

library MinterStorage {
    function initialize() internal {
        state().storageVersion += 1;
        state().initialized = true;
    }

    function state() internal pure returns (MinterState storage ms_) {
        bytes32 position = MINTER_STORAGE_POSITION;
        /// @solidity memory-safe-assembly
        assembly {
            ms_.slot := position
        }
    }
}
