// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IVaultFeed
 * @author Kresko
 * @notice Minimal interface for Vault exchange rate consumers.
 */
interface IVaultFeed {
    function exchangeRate() external view returns (uint256);
}
