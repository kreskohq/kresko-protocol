// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

contract LogicA {
    uint256 public meaningOfLife;
    address public owner;

    function initialize() public {
        meaningOfLife = 42;
        owner = msg.sender;
    }
}

contract LogicB {
    uint256 public meaningOfLife;
    address public owner;

    function initialize(address _owner, uint256 meaning) public {
        meaningOfLife = meaning;
        owner = _owner;
    }

    function setMeaning(uint256 meaning) public {
        meaningOfLife = meaning;
    }
}
