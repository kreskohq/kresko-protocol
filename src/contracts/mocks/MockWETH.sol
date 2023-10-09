// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import {WETH9} from "vendor/WETH9.sol";

contract MockWETH is WETH9 {
    mapping(address => bool) public minters;

    constructor() {
        minters[msg.sender] = true;
    }

    function deposit(uint256 amount) public {
        require(minters[msg.sender], "Not a minter");
        balanceOf[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }
}
