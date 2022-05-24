// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {DiamondStorage, DSModifiers, DS} from "../storage/DS.sol";
import {AccessEvent} from "../libraries/Events.sol";
import {IOwnership} from "../interfaces/IOwnership.sol";

contract DSOwnership is DSModifiers, IOwnership {
    /* -------------------------------------------------------------------------- */
    /*                                    Write                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @dev Initiate ownership transfer to a new address
     * @param _newOwner address that is set as the pending new owner
     * @notice caller must be the current contract owner
     */
    function transferOwnership(address _newOwner) external override onlyOwner {
        require(_newOwner != address(0), "DS: Owner cannot be 0-address");

        DiamondStorage storage s = DS.ds();
        s.pendingOwner = _newOwner;

        emit AccessEvent.PendingOwnershipTransfer(s.contractOwner, _newOwner);
    }

    /**
     * @dev Transfer the ownership to the new pending owner
     * @notice caller must be the pending owner
     */
    function acceptOwnership() external override onlyPendingOwner {
        DiamondStorage storage s = DS.ds();
        s.contractOwner = s.pendingOwner;
        s.pendingOwner = address(0);

        emit AccessEvent.OwnershipTransferred(s.contractOwner, msg.sender);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Read                                    */
    /* -------------------------------------------------------------------------- */

    /// @dev Getter for the current owner
    function owner() external view override returns (address contractOwner_) {
        DS.contractOwner();
    }

    /// @dev Getter for the pending owner
    function pendingOwner() external view override returns (address contractOwner_) {
        DS.pendingOwner();
    }
}
