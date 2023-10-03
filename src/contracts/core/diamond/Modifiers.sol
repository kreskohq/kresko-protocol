// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Meta} from "libs/Meta.sol";
import {CError} from "common/CError.sol";
import {ds} from "diamond/State.sol";

abstract contract DSModifiers {
    modifier onlyOwner() {
        if (Meta.msgSender() != ds().contractOwner) {
            revert CError.NOT_OWNER(Meta.msgSender(), ds().contractOwner);
        }
        _;
    }

    modifier onlyPendingOwner() {
        if (Meta.msgSender() != ds().pendingOwner) {
            revert CError.NOT_PENDING_OWNER(Meta.msgSender(), ds().pendingOwner);
        }
        _;
    }
}
