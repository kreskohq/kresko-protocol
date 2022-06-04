// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IOwnership} from "../interfaces/IOwnership.sol";
import {AccessControlEvent} from "../Events.sol";
import {DiamondModifiers} from "../Modifiers.sol";
import {DiamondStorage, DiamondState} from "../storage/DiamondStorage.sol";

contract DiamondOwnershipFacet is DiamondModifiers, IOwnership {
    /* -------------------------------------------------------------------------- */
    /*                                    Write                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Initiate ownership transfer to a new address
     * - caller must be the current contract owner
     * - the new owner cannot be address(0)
     * - emits a {AccessControlEvent.PendingOwnershipTransfer} event
     * @param _newOwner address that is set as the pending new owner
     */
    function transferOwnership(address _newOwner) external override onlyOwner {
        DiamondStorage.initiateOwnershipTransfer(_newOwner);
    }

    /**
     * @notice Transfer the ownership to the new pending owner
     * - caller must be the pending owner
     * - emits a {AccessEvent.OwnershipTransferred} event
     */
    function acceptOwnership() external override onlyPendingOwner {
        DiamondStorage.finalizeOwnershipTransfer();
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Read                                    */
    /* -------------------------------------------------------------------------- */

    /// @notice Getter for the current owner
    function owner() external view override returns (address) {
        return DiamondStorage.contractOwner();
    }

    /// @notice Getter for the pending owner
    /// @return address
    function pendingOwner() external view override returns (address) {
        return DiamondStorage.pendingContractOwner();
    }

    /// @notice Initialization status getter
    /// @return initialized status
    function initialized() external view returns (bool) {
        return DiamondStorage.state().initialized;
    }
}
