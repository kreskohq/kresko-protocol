// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import {DiamondModifiers} from "../shared/Modifiers.sol";
import {SmockStorage} from "./SmockStorage.sol";
import {ISmockFacet} from "./interfaces/ISmockFacet.sol";

bytes32 constant TEST_OPERATOR_ROLE = keccak256("kresko.test.operator");

library Errors {
    string public constant INITIALIZED = "Already initialized";
    string public constant NOT_ACTIVE = "SmockFacet: Not active";
    string public constant ACTIVE = "SmockFacet: Active";
}

abstract contract SmockModifiers is DiamondModifiers {
    modifier onlyActive() {
        require(SmockStorage.state().isActive, Errors.ACTIVE);
        _;
    }
    modifier onlyDisabled() {
        require(!SmockStorage.state().isActive, Errors.NOT_ACTIVE);
        _;
    }
}

/**
 * @dev Use for Smock fakes / mocks.
 */
contract SmockFacet is SmockModifiers, ISmockFacet {
    uint256 public constant MESSAGE_THROTTLE = 2;

    function operator() external view returns (address) {
        return SmockStorage.state().operator;
    }

    function activate() external onlyRole(TEST_OPERATOR_ROLE) onlyDisabled {
        SmockStorage.activate();
    }

    function disable() external onlyRole(TEST_OPERATOR_ROLE) onlyActive {
        SmockStorage.disable();
    }

    function smockInitialized() external view returns (bool) {
        return SmockStorage.state().initialized;
    }

    function setMessage(string memory message) external onlyActive {
        require(block.number >= SmockStorage.state().lastMessageBlock + MESSAGE_THROTTLE, "Cant set message yet");

        SmockStorage.state().message = message;
        SmockStorage.state().callers[msg.sender] = true;

        emit SmockStorage.Call(msg.sender);
        emit NewMessage(msg.sender, message);
    }
}
