// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import {IERC165} from "vendor/IERC165.sol";
import {Meta} from "libs/Meta.sol";
import {CError} from "common/CError.sol";
import {AuthEvent} from "common/Events.sol";
import {IDiamondLoupeFacet} from "diamond/interfaces/IDiamondLoupeFacet.sol";
import {IDiamondOwnershipFacet} from "diamond/interfaces/IDiamondOwnershipFacet.sol";
import {IDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {DiamondState} from "diamond/State.sol";

library DCore {
    /* -------------------------------------------------------------------------- */
    /*                         Initialization & Ownership                         */
    /* -------------------------------------------------------------------------- */

    /// @notice Ownership initializer
    /// @notice Only called on the first deployment
    function initialize(DiamondState storage self, address _owner) internal {
        if (self.initialized) {
            revert CError.ALREADY_INITIALIZED();
        }

        self.initialized = true;
        self.storageVersion++;
        self.diamondDomainSeparator = Meta.domainSeparator("Kresko Protocol", "V1");
        self.contractOwner = _owner;

        self.supportedInterfaces[type(IDiamondLoupeFacet).interfaceId] = true;
        self.supportedInterfaces[type(IERC165).interfaceId] = true;
        self.supportedInterfaces[type(IDiamondCutFacet).interfaceId] = true;
        self.supportedInterfaces[type(IDiamondOwnershipFacet).interfaceId] = true;

        emit AuthEvent.OwnershipTransferred(address(0), _owner);
    }

    /**
     * @dev Initiate ownership transfer to a new address
     * @param _newOwner address that is set as the pending new owner
     * @notice caller must be the current contract owner
     */
    function initiateOwnershipTransfer(DiamondState storage self, address _newOwner) internal {
        if (Meta.msgSender() != self.contractOwner) revert CError.NOT_OWNER(Meta.msgSender(), self.contractOwner);
        else if (_newOwner == address(0)) revert CError.ZERO_ADDRESS();

        self.pendingOwner = _newOwner;

        emit AuthEvent.PendingOwnershipTransfer(self.contractOwner, _newOwner);
    }

    /**
     * @dev Transfer the ownership to the new pending owner
     * @notice caller must be the pending owner
     */
    function finalizeOwnershipTransfer(DiamondState storage self) internal {
        address sender = Meta.msgSender();
        if (sender != self.pendingOwner) revert CError.NOT_PENDING_OWNER(sender, self.pendingOwner);

        self.contractOwner = self.pendingOwner;
        self.pendingOwner = address(0);

        emit AuthEvent.OwnershipTransferred(self.contractOwner, sender);
    }
}
