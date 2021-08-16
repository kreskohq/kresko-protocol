// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../libraries/FixedPoint.sol";

contract NonRebasingWrapperToken is ERC20 {
    using FixedPoint for FixedPoint.Unsigned;

    IERC20 public underlyingToken;

    event DepositedUnderlying(address indexed account, uint256 depositAmount, uint256 mintAmount);
    event WithdrewUnderlying(address indexed account, uint256 underlyingAmount, uint256 nonRebasingAmount);

    constructor(
        address underlyingToken_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {
        underlyingToken = IERC20(underlyingToken_);
    }

    function depositUnderlying(uint256 underlyingAmount) external {
        uint256 underlyingBalanceBefore = underlyingToken.balanceOf(address(this));
        require(
            underlyingToken.transferFrom(msg.sender, address(this), underlyingAmount),
            "UNDERLYING_TRANSFER_IN_FAILED"
        );
        uint256 underlyingBalanceAfter = underlyingToken.balanceOf(address(this));
        // Calculate the actual difference in balance of this contract instead of using amount.
        uint256 depositAmount = underlyingBalanceAfter - underlyingBalanceBefore;

        uint256 mintAmount =
            underlyingBalanceBefore == 0 ? depositAmount : (depositAmount * totalSupply()) / underlyingBalanceBefore;
        _mint(msg.sender, mintAmount);

        emit DepositedUnderlying(msg.sender, depositAmount, mintAmount);
    }

    function withdrawUnderlying(uint256 nonRebasingAmount) external {
        uint256 balance = balanceOf(msg.sender);
        require(nonRebasingAmount <= balance, "WITHDRAW_AMOUNT_TOO_HIGH");

        // Withdraw the underlying tokens. underlyingAmount will never be
        // greater than this contract's balance of the underlying token due
        // to the way getUnderlyingAmount works.
        uint256 underlyingAmount = getUnderlyingAmount(nonRebasingAmount);
        require(underlyingToken.transfer(msg.sender, underlyingAmount), "UNDERLYING_TRANSFER_OUT_FAILED");

        // Burn the balance of non-rebasing tokens.
        // It's important to do this after the above call to getUnderlyingAmount,
        // because getUnderlyingAmount relies upon the total supply and _burn will
        // decrement the total supply.
        // Note that it would ordinarily be safer to burn prior to transferring funds out,
        // but because the only external call is to the underlyingToken that is assumed
        // to be safe, this is okay.
        _burn(msg.sender, nonRebasingAmount);

        emit WithdrewUnderlying(msg.sender, underlyingAmount, nonRebasingAmount);
    }

    function balanceOfUnderlying(address account) external view returns (uint256) {
        return getUnderlyingAmount(balanceOf(account));
    }

    // TODO think about how overflow may affect this??
    // Note that due to loss of precision, when nonRebasingAmount is less than
    // the total supply, this will return a value that will be <= the "true" amount,
    // effectively accumulating value to the rest of the tokens.
    function getUnderlyingAmount(uint256 nonRebasingAmount) public view returns (uint256) {
        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            return 0;
        }
        FixedPoint.Unsigned memory shareOfToken =
            FixedPoint.Unsigned(nonRebasingAmount).div(FixedPoint.Unsigned(_totalSupply));
        uint256 underlyingBalance = underlyingToken.balanceOf(address(this));
        // is this okay lol
        return shareOfToken.mul(FixedPoint.Unsigned(underlyingBalance)).rawValue;
    }
}

// userBalanceOfUnderlying = (userBalanceOf / totalSupply) * contractUnderlyingBalance

// correct:

// underlyingDeposited = (tokensMinted / (totalSupplyBefore + tokensMinted)) * contractUnderlyingBalanceAfter
// a = (b / (c + b)) * d, solve for b
// according to wolfram:
//
// b = (ac) / (d - a)
// Yes:
// tokensMinted = (underlyingDeposited * totalSupplyBefore) / (contractUnderlyingBalanceAfter - underlyingDeposited)
