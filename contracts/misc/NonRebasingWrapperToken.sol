// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../libraries/FixedPoint.sol";

/**
 * @title A non-rebasing wrapper token.
 * @notice A non-rebasing token that wraps rebasing tokens to present a balance for each user that
 *   does not change from exogenous events.
 */
contract NonRebasingWrapperToken is ERC20 {
    using FixedPoint for FixedPoint.Unsigned;

    // The underlying token that this contract wraps.
    IERC20 public underlyingToken;

    // Emitted when underlying tokens have been deposited, minting this token.
    event DepositedUnderlying(address indexed account, uint256 underlyingDepositAmount, uint256 mintAmount);
    // Emitted when underlying tokens have been withdrawn, burning this token.
    event WithdrewUnderlying(address indexed account, uint256 underlyingWithdrawAmount, uint256 burnAmount);

    constructor(
        address underlyingToken_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {
        underlyingToken = IERC20(underlyingToken_);
    }

    /**
     * @notice Deposits an amount of the underlying token, minting an amount of this token
     *   according to the deposit amount.
     * @dev The amount of the underlying deposited that's used in any calculations is
     *   the difference in this contract's balance after transferring in underlyingDepositAmount.
     * @param underlyingDepositAmount The amount of the underlying token to transfer in as a deposit.
     */
    function depositUnderlying(uint256 underlyingDepositAmount) external {
        // Calculate the actual difference in balance of this contract instead of using amount.
        // This handles cases where a token transfer has a fee.
        uint256 underlyingBalanceBefore = underlyingToken.balanceOf(address(this));
        require(
            underlyingToken.transferFrom(msg.sender, address(this), underlyingDepositAmount),
            "UNDERLYING_TRANSFER_IN_FAILED"
        );
        uint256 underlyingBalanceAfter = underlyingToken.balanceOf(address(this));
        uint256 depositAmount = underlyingBalanceAfter - underlyingBalanceBefore;

        require(depositAmount > 0, "DEPOSIT_AMOUNT_ZERO");

        uint256 _totalSupply = totalSupply();
        // If this contract has a total supply of 0 or no prior underlying balance, mint at a 1:1 rate.
        // In an extreme case, it's possible for this contract to have a total supply > 0 but
        // underlyingBalanceBefore == 0, e.g. if the rebasing of the underlying token caused a loss
        // of precision. In this case, there's no super fair option other than just minting at a 1:1 rate.
        //
        // In a case where this contract has a total supply > 0 and a prior underlying balance > 0,
        // the mintAmount is calculated based off the formula used for getting the underlying
        // amount owed to a holder of this contract's token used by `balanceOfUnderlying`:
        //   userBalanceOfUnderlying = (userBalanceOf / totalSupply) * contractUnderlyingBalance
        // Extended to a case for newly minted tokens from a deposit:
        //   underlyingDeposited = (tokensMinted / (totalSupplyBefore + tokensMinted)) * contractUnderlyingBalanceAfter
        //
        //   tokensMinted = (underlyingDeposited * totalSupplyBefore) /
        //     (contractUnderlyingBalanceAfter - underlyingDeposited)
        //
        //   tokensMinted = (underlyingDeposited * totalSupplyBefore) / contractUnderlyingBalanceBefore
        uint256 mintAmount =
            _totalSupply == 0 || underlyingBalanceBefore == 0
                ? depositAmount
                : (depositAmount * totalSupply()) / underlyingBalanceBefore;
        _mint(msg.sender, mintAmount);

        emit DepositedUnderlying(msg.sender, depositAmount, mintAmount);
    }

    /**
     * @notice Withdraws an underlying token amount corresponding to the provided
     *   amount of this token, burning the tokens.
     * @param nonRebasingWithdrawalAmount Denominated in this token, the amount
     *   to burn. Used to calculate the amount of underlying tokens that are withdrawn as a result.
     */
    function withdrawUnderlying(uint256 nonRebasingWithdrawalAmount) external {
        require(nonRebasingWithdrawalAmount > 0, "WITHDRAW_AMOUNT_ZERO");
        require(nonRebasingWithdrawalAmount <= balanceOf(msg.sender), "WITHDRAW_AMOUNT_TOO_HIGH");

        // Withdraw the underlying tokens. underlyingAmount will never be
        // greater than this contract's balance of the underlying token due
        // to the way getUnderlyingAmount works.
        uint256 underlyingAmount = getUnderlyingAmount(nonRebasingWithdrawalAmount);
        require(underlyingToken.transfer(msg.sender, underlyingAmount), "UNDERLYING_TRANSFER_OUT_FAILED");

        // Burn the balance of non-rebasing tokens.
        // It's important to do this after the above call to getUnderlyingAmount,
        // because getUnderlyingAmount relies upon the total supply and _burn will
        // decrement the total supply.
        // Note that it would ordinarily be safer to burn prior to transferring funds out,
        // but because the only external call is to the underlyingToken that is assumed
        // to be safe, this is okay.
        _burn(msg.sender, nonRebasingWithdrawalAmount);

        emit WithdrewUnderlying(msg.sender, underlyingAmount, nonRebasingWithdrawalAmount);
    }

    /**
     * @notice Gets the amount of the underlying tokens an account owns based off their
     *   balance of this token.
     * @param account The account to view the underlying balance of.
     * @return The amount of underlying tokens the account owns in this contract.
     */
    function balanceOfUnderlying(address account) external view returns (uint256) {
        return getUnderlyingAmount(balanceOf(account));
    }

    /**
     * @notice Gets the amount of underlying tokens corresponding to a provided amount of this contract's tokens.
     * @dev Loss of precision could result in a marginally lower amount returned, but should never
     *   result in a higher value than intended. Dust from any lower amounts that are withdrawn
     *   effectively accumulate to the rest of token holders.
     * @param nonRebasingAmount The non-rebasing amount of tokens, i.e. denominated in this contract's tokens.
     * @return The amount of underlying tokens corresponding to nonRebasingAmount of this contract's tokens.
     */
    function getUnderlyingAmount(uint256 nonRebasingAmount) public view returns (uint256) {
        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0 || nonRebasingAmount == 0) {
            return 0;
        }
        require(nonRebasingAmount <= _totalSupply, "NON_REBASING_AMOUNT_TOO_HIGH");
        FixedPoint.Unsigned memory shareOfToken =
            FixedPoint.Unsigned(nonRebasingAmount).div(FixedPoint.Unsigned(_totalSupply));
        uint256 underlyingBalance = underlyingToken.balanceOf(address(this));
        // Because shareOfToken has a max rawValue of 1e18, this calculation can overflow
        // if underlyingBalance has a value of ((2^256) - 1) / 1e18. For an underlying
        // token with 18 decimals, this means this contract can at most tolerate an underlying
        // balance of ((2^256) - 1) / 1e18 / 1e18 = 115792089237316195423570985008687907853269
        // whole tokens. This is more than enough for any reasonable token, though
        // keep this in mind if the underlying has many decimals or a very low value.
        return shareOfToken.mul(FixedPoint.Unsigned(underlyingBalance)).rawValue;
    }
}
