// SPDX-License-Identifier: MIT
pragma solidity >=0.8.11;

import "../../../libraries/FixedPoint.sol";
import "../../../libraries/FixedPointMath.sol";
import "../../../libraries/Arrays.sol";

import "./MinterTypes.sol";

/* solhint-disable no-inline-assembly */
/* solhint-disable state-visibility */

library MS {
    bytes32 constant MINTER_STORAGE_POSITION = keccak256("kresko.minter.storage");

    function s() internal pure returns (MinterStorage storage ms_) {
        bytes32 position = MINTER_STORAGE_POSITION;
        assembly {
            ms_.slot := position
        }
    }
}
