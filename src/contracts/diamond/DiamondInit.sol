// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IDiamondLoupe} from "./interfaces/IDiamondLoupe.sol";
import {IDiamondCut} from "./interfaces/IDiamondCut.sol";
import {IOwnership} from "./interfaces/IOwnership.sol";

import "./shared/Events.sol";
import "./shared/Modifiers.sol";
import "./shared/AccessControl.sol";

import {DiamondStorage} from "./storage/DiamondStorage.sol";

contract DiamondInit is WithStorage {
    function initialize(address _admin) external {
        require(msg.sender == ds().contractOwner, "DS: Only owner can call this function");

        AccessControl._grantRole(DEFAULT_ADMIN_ROLE, _admin);

        ds().domainSeparator = Meta.domainSeparator("Kresko Protocol", "V1");

        emit GeneralEvent.Initialized(_admin, ds().storageVersion);
    }
}
