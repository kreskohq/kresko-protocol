// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import {GeneralEvent} from "../shared/Events.sol";
import "../shared/Modifiers.sol";

import {ISmockFacet} from "./interfaces/ISmockFacet.sol";
import {TEST_OPERATOR_ROLE} from "./SmockFacet.sol";
import {SmockStorage} from "./SmockStorage.sol";

contract SmockInit is DiamondModifiers {
    function initialize(address _operator) external onlyOwner onlyRole(Role.ADMIN) {
        require(msg.sender == ds().contractOwner, "WithStorage: Not owner");
        SmockStorage.initialize(_operator);

        AccessControl.grantRole(TEST_OPERATOR_ROLE, _operator);

        ds().supportedInterfaces[type(ISmockFacet).interfaceId] = true;
        emit GeneralEvent.Initialized(msg.sender, 1);
    }
}
