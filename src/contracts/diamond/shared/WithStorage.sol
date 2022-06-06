// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../libraries/FixedPoint.sol";
import "../libraries/FixedPointMath.sol";
import "../libraries/Arrays.sol";

import {DiamondStorage, DiamondState} from "../storage/DiamondStorage.sol";
import {MinterStorage, MinterState} from "../storage/MinterStorage.sol";

abstract contract WithStorage {
    using MinterStorage for MinterState;
    using DiamondStorage for DiamondState;

    // Diamond base storage state accessor
    function ds() internal pure returns (DiamondState storage) {
        return DiamondStorage.state();
    }

    // Minter storage state accessor
    function ms() internal pure returns (MinterState storage) {
        return MinterStorage.state();
    }
}
