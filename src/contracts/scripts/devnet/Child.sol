// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

contract Child {
    uint256 meaningOfLife;
    address owner;
}

contract ChildWithCtor {
    uint256 meaningOfLife;
    address owner;

    constructor(uint256 _meaning, address _owner) {
        meaningOfLife = _meaning;
        owner = _owner;
    }
}
