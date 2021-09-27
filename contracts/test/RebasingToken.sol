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

    function allowance(address _owner, address _spender) external view returns (uint256) {
        return _allowances[_owner][_spender];
    }

    function approve(address _spender, uint256 _amount) external returns (bool) {
        _allowances[msg.sender][_spender] = _amount;
        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) external returns (bool) {
        return _transfer(_from, _to, _amount);
    }

    function transfer(address _to, uint256 _amount) external returns (bool) {
        return _transfer(msg.sender, _to, _amount);
    }

    function _transfer(
        address _from,
        address _to,
        uint256 _amount
    ) private returns (bool) {
        uint256 nonRebasedAmount = fromRebasedAmount(_amount);
        if (_from != msg.sender) {
            _allowances[_from][_to] -= _amount;
        }
        require(_balances[_from] >= nonRebasedAmount, "ERC20: transfer amount exceeds balance");
        _balances[_from] -= nonRebasedAmount;
        _balances[_to] += nonRebasedAmount;
        return true;
    }

    function mint(address _account, uint256 _amount) external {
        _balances[_account] += fromRebasedAmount(_amount);
    }

    function balanceOf(address _account) external view returns (uint256) {
        return toRebasedAmount(_balances[_account]);
    }

    function toRebasedAmount(uint256 _nonRebasedAmount) private view returns (uint256) {
        return FixedPoint.Unsigned(_nonRebasedAmount).mul(rebaseFactor).rawValue;
    }

    function fromRebasedAmount(uint256 _rebasedAmount) private view returns (uint256) {
        return FixedPoint.Unsigned(_rebasedAmount).div(rebaseFactor).rawValue;
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
