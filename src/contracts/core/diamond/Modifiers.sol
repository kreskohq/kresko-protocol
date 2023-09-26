// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Meta} from "libs/Meta.sol";
import {Error} from "common/Errors.sol";
import {ds} from "diamond/State.sol";

abstract contract DSModifiers {
    modifier onlyOwner() {
        require(Meta.msgSender() == ds().contractOwner, Error.DIAMOND_INVALID_OWNER);
        _;
    }

    modifier onlyPendingOwner() {
        require(Meta.msgSender() == ds().pendingOwner, Error.DIAMOND_INVALID_PENDING_OWNER);
        _;
    }
}
