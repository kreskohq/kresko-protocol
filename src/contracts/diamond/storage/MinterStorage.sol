/* solhint-disable no-inline-assembly */
/* solhint-disable state-visibility */

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../libraries/FixedPoint.sol";
import "../libraries/FixedPointMath.sol";
import "../libraries/Arrays.sol";

import "../shared/Errors.sol";
import "../shared/Events.sol";
import "../shared/Meta.sol";

import "./MinterStructs.sol";

bytes32 constant MINTER_STORAGE_POSITION = keccak256("kresko.minter.storage");

library MinterStorage {
    function initialize() internal {
        state().storageVersion += 1;
        state().initialized = true;
    }

    function state() internal pure returns (MinterState storage ms_) {
        bytes32 position = MINTER_STORAGE_POSITION;
        assembly {
            ms_.slot := position
        }
    }
}
