// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IERC165} from "../interfaces/IERC165.sol";
import {ISmockFacet} from "./interfaces/ISmockFacet.sol";

import {AccessControlEvent, GeneralEvent} from "../shared/Events.sol";
import {AccessControl, DEFAULT_ADMIN_ROLE} from "../shared/AccessControl.sol";
import {DiamondModifiers} from "../shared/Modifiers.sol";
import {WithStorage} from "../shared/WithStorage.sol";
import {TEST_OPERATOR_ROLE} from "./SmockFacet.sol";
import {SmockStorage} from "./SmockStorage.sol";

contract SmockInit is WithStorage, DiamondModifiers {
    function initialize(address _operator) external onlyOwner onlyRole(DEFAULT_ADMIN_ROLE) {
        require(msg.sender == ds().contractOwner, "WithStorage: Not owner");
        SmockStorage.initialize(_operator);

        AccessControl.grantRole(TEST_OPERATOR_ROLE, _operator);

        ds().supportedInterfaces[type(ISmockFacet).interfaceId] = true;
        emit GeneralEvent.Initialized(msg.sender, 1);
    }
}
