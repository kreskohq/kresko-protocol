// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../libraries/FixedPoint.sol";

contract RebasingToken {
    using FixedPoint for FixedPoint.Unsigned;

    FixedPoint.Unsigned public rebaseFactor;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) public _allowances;

    constructor(uint256 _rebaseFactor) {
        setRebaseFactor(_rebaseFactor);
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        return _transfer(from, to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) private returns (bool) {
        uint256 nonRebasedAmount = fromRebasedAmount(amount);
        if (from != msg.sender) {
            _allowances[from][to] -= amount;
        }
        _balances[from] -= nonRebasedAmount;
        _balances[to] += nonRebasedAmount;
        return true;
    }

    function mint(address account, uint256 amount) external {
        _balances[account] += fromRebasedAmount(amount);
    }

    function balanceOf(address account) external view returns (uint256) {
        return toRebasedAmount(_balances[account]);
    }

    function toRebasedAmount(uint256 nonRebasedAmount) private view returns (uint256) {
        return FixedPoint.Unsigned(nonRebasedAmount).mul(rebaseFactor).rawValue;
    }

    function fromRebasedAmount(uint256 rebasedAmount) private view returns (uint256) {
        return FixedPoint.Unsigned(rebasedAmount).div(rebaseFactor).rawValue;
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function name() external pure returns (string memory) {
        return "Test Rebasing Token";
    }

    function symbol() external pure returns (string memory) {
        return "FOO";
    }

    function setRebaseFactor(uint256 _rebaseFactor) public {
        rebaseFactor = FixedPoint.Unsigned(_rebaseFactor);
    }
}
