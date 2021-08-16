// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

/**
 * A super basic token-like contract that's intended for tests.
 */
contract MockToken {
    mapping(address => uint256) public balanceOf;

    uint8 public decimals;

    constructor(uint8 _decimals) {
        decimals = _decimals;
    }

    function setBalanceOf(address account, uint256 value) external {
        balanceOf[account] = value;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
