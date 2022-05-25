// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {DiamondStorage, DSModifiers, DS} from "../storage/DS.sol";
import {AccessEvent} from "../../events/Events.sol";
import {IOwnership} from "../interfaces/IOwnership.sol";

contract DSOwnership is DSModifiers, IOwnership {
    /* ========================================================================== */
    /*                                    WRITE                                   */
    /* ========================================================================== */

    /**
     * @notice Initiate ownership transfer to a new address
     * - caller must be the current contract owner
     * - the new owner cannot be address(0)
     * - emits a {AccessEvent.PendingOwnershipTransfer} event
     * @param _newOwner address that is set as the pending new owner
     */
    function transferOwnership(address _newOwner) external override onlyOwner {
        DS.initiateOwnershipTransfer(_newOwner);
    }

    /**
     * @notice Transfer the ownership to the new pending owner
     * - caller must be the pending owner
     * - emits a {AccessEvent.OwnershipTransferred} event
     */
    function acceptOwnership() external override onlyPendingOwner {
        DS.finalizeOwnershipTransfer();
    }

    /* ========================================================================== */
    /*                                    READ                                    */
    /* ========================================================================== */

    /// @notice Getter for the current owner
    function owner() external view override returns (address) {
        return DS.contractOwner();
    }

    /// @notice Getter for the pending owner
    /// @return address
    function pendingOwner() external view override returns (address) {
        return DS.pendingContractOwner();
    }
}
