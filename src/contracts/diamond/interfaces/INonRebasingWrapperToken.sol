// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "../libraries/FP.sol";

/**
 * @title A non-rebasing wrapper token.
 * @notice A non-rebasing token that wraps rebasing tokens to present a balance for each user that
 *   does not change from exogenous events.
 */
interface INonRebasingWrapperToken is IERC20Upgradeable {
    // Emitted when underlying tokens have been deposited, minting this token.
    event DepositedUnderlying(address indexed account, uint256 underlyingDepositAmount, uint256 mintAmount);
    // Emitted when underlying tokens have been withdrawn, burning this token.
    event WithdrewUnderlying(address indexed account, uint256 underlyingWithdrawAmount, uint256 burnAmount);

    /// @notice The underlying token that this contract wraps.
    function underlyingToken() external returns (address);

    /**
     * @notice Deposits an amount of the underlying token, minting an amount of this token
     *   according to the deposit amount.
     * @dev The amount of the underlying deposited that's used in any calculations is
     *   the difference in this contract's balance after transferring in underlyingDepositAmount.
     * @param _underlyingDepositAmount The amount of the underlying token to transfer in as a deposit.
     * @return The amount of this token that was minted for the deposit.
     */
    function depositUnderlying(uint256 _underlyingDepositAmount) external returns (uint256);

    /**
     * @notice Withdraws an underlying token amount corresponding to the provided
     *   amount of this token, burning the tokens.
     * @param _nonRebasingWithdrawalAmount Denominated in this token, the amount
     *   to burn. Used to calculate the amount of underlying tokens that are withdrawn as a result.
     * @return The amount of the rebasing underlying token withdrawn.
     */
    function withdrawUnderlying(uint256 _nonRebasingWithdrawalAmount) external returns (uint256);

    /**
     * @notice Gets the amount of the underlying tokens an account owns based off their
     *   balance of this token.
     * @param _account The account to view the underlying balance of.
     * @return The amount of underlying tokens the account owns in this contract.
     */
    function balanceOfUnderlying(address _account) external view returns (uint256);

    /**
     * @notice Gets the amount of underlying tokens corresponding to a provided amount of this contract's tokens.
     * @dev Loss of precision could result in a marginally lower amount returned, but should never
     *   result in a higher value than intended. Dust from any lower amounts that are withdrawn
     *   effectively accumulate to the rest of token holders.
     * @param _nonRebasingAmount The non-rebasing amount of tokens, i.e. denominated in this contract's tokens.
     * @return The amount of underlying tokens corresponding to nonRebasingAmount of this contract's tokens.
     */
    function getUnderlyingAmount(uint256 _nonRebasingAmount) external view returns (uint256);
}
