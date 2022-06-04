// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {DiamondStorage, DiamondState} from "./storage/DiamondStorage.sol";
import {MinterStorage, MinterState} from "./storage/MinterStorage.sol";

/// @title Storage access helper for inheriting contracts.
/// @notice Write and read example: `ds().myVar` or `ds().foo = "bar"`
abstract contract WithStorage {
    // Diamond base storage state accessor
    function ds() internal pure returns (DiamondState storage) {
        return DiamondStorage.state();
    }

    // Minter storage state accessor
    function ms() internal pure returns (MinterState storage) {
        return MinterStorage.state();
    }
}
