// SPDX-License-Identifier: MIT

import {AccessEvent} from "./LibEvents.sol";

import "../storage/DS.sol";
import "../../kresko/storage/KS.sol";
import "../../minter/storage/MS.sol";

/* solhint-disable no-inline-assembly */

pragma solidity >=0.8.4;

/* -------------------------------------------------------------------------- */
/*                               Kresko General                               */
/* -------------------------------------------------------------------------- */

library KSOwnership {
    function initializeOwner(address _owner) internal {
        KrStorage storage s = KS.s();
        require(s.contractOwner == address(0), "KS: Owner already initialized");
        s.contractOwner = _owner;

        emit AccessEvent.OwnershipTransferred(address(0), _owner);
    }

    function initiateOwnershipTransfer(address _newOwner) internal {
        require(_newOwner != address(0), "KS: Owner cannot be 0-address");
        KrStorage storage s = KS.s();
        s.pendingOwner = _newOwner;

        emit AccessEvent.PendingOwnershipTransfer(s.contractOwner, _newOwner);
    }

    function pendingContractOwner() internal view returns (address pendingOwner_) {
        KrStorage storage s = KS.s();
        pendingOwner_ = s.pendingOwner;
    }

    function acceptPendingOwnership() internal {
        KrStorage storage s = KS.s();
        s.contractOwner = s.pendingOwner;
        s.pendingOwner = address(0);

        emit AccessEvent.OwnershipTransferred(s.contractOwner, msg.sender);
    }

    function contractOwner() internal view returns (address contractOwner_) {
        contractOwner_ = KS.s().contractOwner;
    }
}

/* -------------------------------------------------------------------------- */
/*                                   Minter                                   */
/* -------------------------------------------------------------------------- */

library MSOwnership {
    function initializeOwner(address _owner) internal {
        MiStorage storage s = MS.s();
        require(s.contractOwner == address(0), "MS: Owner already initialized");
        s.contractOwner = _owner;

        emit AccessEvent.OwnershipTransferred(address(0), _owner);
    }

    function initiateOwnershipTransfer(address _newOwner) internal {
        require(_newOwner != address(0), "MS: Owner cannot be 0-address");
        MiStorage storage s = MS.s();
        s.pendingOwner = _newOwner;

        emit AccessEvent.PendingOwnershipTransfer(s.contractOwner, _newOwner);
    }

    function pendingContractOwner() internal view returns (address pendingOwner_) {
        MiStorage storage s = MS.s();
        pendingOwner_ = s.pendingOwner;
    }

    function acceptPendingOwnership() internal {
        MiStorage storage s = MS.s();
        s.contractOwner = s.pendingOwner;
        s.pendingOwner = address(0);

        emit AccessEvent.OwnershipTransferred(s.contractOwner, msg.sender);
    }

    function contractOwner() internal view returns (address contractOwner_) {
        contractOwner_ = MS.s().contractOwner;
    }

    function enforceIsContractOwner() internal view {
        require(msg.sender == MS.s().contractOwner, "MS: Must be contract owner");
    }

    function enforceIsPendingOwner() internal view {
        require(msg.sender == MS.s().pendingOwner, "MS: Must be pending contract owner");
    }
}
