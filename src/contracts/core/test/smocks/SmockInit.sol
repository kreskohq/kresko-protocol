// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {DiamondEvent} from "common/Events.sol";
import {Role} from "common/Types.sol";
import {Auth} from "common/Auth.sol";
import {ds} from "diamond/State.sol";
import {DSModifiers} from "diamond/Modifiers.sol";

import {ISmockFacet} from "./ISmockFacet.sol";
import {TEST_OPERATOR_ROLE} from "./SmockFacet.sol";
import {SmockStorage} from "./SmockStorage.sol";

contract SmockInit is DSModifiers {
    function initialize(address _operator) external onlyOwner onlyRole(Role.ADMIN) {
        require(msg.sender == ds().contractOwner, "WithStorage: Not owner");
        SmockStorage.initialize(_operator);

        Auth.grantRole(TEST_OPERATOR_ROLE, _operator);

        ds().supportedInterfaces[type(ISmockFacet).interfaceId] = true;
        emit DiamondEvent.Initialized(msg.sender, 1);
    }

    function getNumber() public pure returns (uint8) {
        return 1;
    }

    function getBool() public pure returns (bool) {
        return false;
    }

    function upgradeState() external {
        ds().initialized = getBool();
    }
}
