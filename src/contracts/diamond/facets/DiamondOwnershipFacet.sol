// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import {IOwnership} from "../interfaces/IOwnership.sol";
import "../../shared/Modifiers.sol";

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
        ds().initiateOwnershipTransfer(_newOwner);
    }

    /**
     * @notice Transfer the ownership to the new pending owner
     * - caller must be the pending owner
     * - emits a {AccessEvent.OwnershipTransferred} event
     */
    function acceptOwnership() external override onlyPendingOwner {
        ds().finalizeOwnershipTransfer();
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Read                                    */
    /* -------------------------------------------------------------------------- */

    /// @notice Getter for the current owner
    function owner() external view override returns (address) {
        return ds().contractOwner;
    }

    /// @notice Getter for the pending owner
    /// @return address
    function pendingOwner() external view override returns (address) {
        return ds().pendingOwner;
    }

    /// @notice Initialization status getter
    /// @return initialized status
    function initialized() external view returns (bool) {
        return ds().initialized;
    }
}
