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

    function setBalanceOf(address _account, uint256 _value) external {
        balanceOf[_account] = _value;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) external returns (bool) {
        balanceOf[_from] -= _amount;
        balanceOf[_to] += _amount;
        return true;
    }

    function transfer(address _to, uint256 _amount) external returns (bool) {
        balanceOf[msg.sender] -= _amount;
        balanceOf[_to] += _amount;
        return true;
    }
}
