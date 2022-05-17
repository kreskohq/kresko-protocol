// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {IOwnership} from "../interfaces/IOwnership.sol";

contract OwnershipFacet is IOwnership {
    function acceptOwnership() external {
        LibDiamond.enforceIsPendingOwner();
        LibDiamond.acceptPendingOwnership();
    }

    function transferOwnership(address _newOwner) external override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.initiateOwnershipTransfer(_newOwner);
    }

    function owner() external view override returns (address owner_) {
        owner_ = LibDiamond.contractOwner();
    }

    function pendingOwner() external view returns (address owner_) {
        owner_ = LibDiamond.contractOwner();
    }
}
