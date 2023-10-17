// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

contract Child {
    uint256 valueUint;
    address owner;
}

contract ChildWithCtor {
    uint256 valueUint;
    address owner;

    constructor(uint256 _meaning, address _owner) {
        valueUint = _meaning;
        owner = _owner;
    }
}
