// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IDiamondLoupe} from "../interfaces/IDiamondLoupe.sol";
import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {IOwnership} from "../interfaces/IOwnership.sol";

import {GeneralEvent} from "../Events.sol";
import {LibMeta} from "../Modifiers.sol";
import {WithStorage} from "../WithStorage.sol";
import {AccessControl, DEFAULT_ADMIN_ROLE} from "../libraries/AccessControl.sol";
import {DiamondStorage} from "../storage/DiamondStorage.sol";
import "hardhat/console.sol";

contract DiamondInit is WithStorage {
    function initialize(address _admin) external {
        require(msg.sender == ds().contractOwner, "DS: Only owner can call this function");

        AccessControl._grantRole(DEFAULT_ADMIN_ROLE, _admin);

        ds().domainSeparator = LibMeta.domainSeparator("Kresko Protocol", "V1");

        emit GeneralEvent.Initialized(_admin, ds().storageVersion);
    }
}
