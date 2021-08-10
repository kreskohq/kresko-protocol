// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../libraries/FixedPoint.sol";

contract NonRebasingWrapperToken {
    IERC20 public underlyingToken;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    constructor(address _underlyingToken) {
        underlyingToken = IERC20(_underlyingToken);
    }

    function balanceOf(address account) returns (uint256) {
        return _balances[account];
    }

    // TODO think about how overflow may affect this
    function balanceOfUnderlying(address account) {
        if (_totalSupply == 0) {
            return 0;
        }
        FixedPoint.Unsigned memory shareOfToken = FixedPoint.Unsigned(
            _balances[account]
        ).div(FixedPoint.Unsigned(_totalSupply));
        FixedPoint.Unsigned memory underlyingBalance = underlyingToken.balanceOf(address(this));
        return shareOfToken.mul(underlyingBalance);
    }

    function decimals() external view returns (uint8) {
        return 18;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }
}



// userBalanceOfUnderlying = (userBalanceOf / totalSupply) * contractUnderlyingBalance

// wtf no:
// userBalanceOf = (userBalanceOfUnderlying / contractUnderlyingBalance) * totalSupply
// tokensMinted = (underlyingDeposited / contractUnderlyingBalance) * (totalSupplyBefore + tokensMinted)

// correct:

// underlyingDeposited = (tokensMinted / (totalSupplyBefore + tokensMinted)) * contractUnderlyingBalance
// a = (b / (c + b)) * d, solve for b
// da = b / (c + b)
// 


// a = (b / c) * (d + a)
// a = d(b / c) + a(b / c)
// a - a(b / c) = d(b / c)
// a(1 - (b / c)) = d(b / c)
// a = (d(b / c)) / (1 - (b / c))

// b = 3
// c = 4
// d = 5

// (3 * (3 / 4)) / (1 - (3 / 4)) = 9

// 9 = (3 / 4) * (5 + 9) ??? no 