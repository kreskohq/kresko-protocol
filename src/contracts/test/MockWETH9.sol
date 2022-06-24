// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../vendor/WETH9.sol";

contract MockWETH9 is WETH9 {
    function deposit(uint256 amount) public {
        balanceOf[msg.sender] += amount;
    }
}
