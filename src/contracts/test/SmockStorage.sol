// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;
import {Errors} from "./SmockFacet.sol";

struct SmockState {
    bool initialized;
    bool isActive;
    address operator;
    mapping(address => bool) callers;
    string message;
    uint256 lastMessageBlock;
}

library SmockStorage {
    event Call(address indexed caller);

    bytes32 public constant SMOCK_STORAGE_POSITION = keccak256("kresko.smock.storage");

    function initialize(address _operator) internal {
        SmockState storage ss = state();
        require(!ss.initialized, Errors.INITIALIZED);
        ss.initialized = true;
        ss.operator = _operator;
        emit Call(msg.sender);
    }

    function state() internal pure returns (SmockState storage ss) {
        bytes32 position = SMOCK_STORAGE_POSITION;
        assembly {
            ss.slot := position
        }
    }

    function activate() internal {
        state().isActive = true;
        state().callers[msg.sender] = true;
        emit Call(msg.sender);
    }

    function disable() internal {
        state().isActive = false;
        state().callers[msg.sender] = true;
        emit Call(msg.sender);
    }
}
