// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {DsStorage, DSModifiers, DS} from "../storage/DS.sol";
import {AccessEvent} from "../libraries/LibEvents.sol";
import {IOwnership} from "../interfaces/IOwnership.sol";

contract DSOwnership is DSModifiers, IOwnership {
    /* -------------------------------------------------------------------------- */
    /*                                    Write                                   */
    /* -------------------------------------------------------------------------- */

    function transferOwnership(address _newOwner) external override onlyOwner {
        require(_newOwner != address(0), "DS: Owner cannot be 0-address");
        DsStorage storage s = DS.ds();
        s.pendingOwner = _newOwner;

        emit AccessEvent.PendingOwnershipTransfer(s.contractOwner, _newOwner);
    }

    function acceptOwnership() external override onlyPendingOwner {
        DsStorage storage s = DS.ds();
        s.contractOwner = s.pendingOwner;
        s.pendingOwner = address(0);

        emit AccessEvent.OwnershipTransferred(s.contractOwner, msg.sender);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Read                                    */
    /* -------------------------------------------------------------------------- */

    function owner() external view override returns (address contractOwner_) {
        contractOwner_ = DS.ds().contractOwner;
    }

    function pendingOwner() external view override returns (address contractOwner_) {
        contractOwner_ = DS.ds().pendingOwner;
    }
}
