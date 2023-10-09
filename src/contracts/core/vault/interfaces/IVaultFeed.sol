// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IVaultFeed
 * @author Kresko
 * @notice Minimal interface for Vault exchange rate consumers.
 */
interface IVaultFeed {
    /// @notice Gets the exchange rate of one vault share to USD.
    /// @return uint256 Exchange rate in 18 decimal precision.
    function exchangeRate() external view returns (uint256);
}
