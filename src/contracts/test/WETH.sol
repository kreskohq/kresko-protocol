// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import "../vendor/WETH9.sol";

contract WETH is WETH9 {
    function deposit(uint256 amount) public {
        balanceOf[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }
}
