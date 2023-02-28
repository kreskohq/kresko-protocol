// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import "../vendor/WETH9.sol";

contract WETH is WETH9 {
    mapping(address => bool) public minters;

    function deposit(uint256 amount) public {
        require(minters[msg.sender], "Not a minter");
        balanceOf[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }
}
