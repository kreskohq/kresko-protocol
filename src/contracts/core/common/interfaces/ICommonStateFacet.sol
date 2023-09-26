// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {Asset} from "common/Types.sol";

interface ICommonStateFacet {
    /// @notice The EIP-712 typehash for the contract's domain.
    function domainSeparator() external view returns (bytes32);

    /// @notice amount of times the storage has been upgraded
    function getStorageVersion() external view returns (uint256);

    /// @notice The recipient of protocol fees.
    function getFeeRecipient() external view returns (address);

    /// @notice Offchain oracle decimals
    function getExtOracleDecimals() external view returns (uint8);

    /// @notice max deviation between main oracle and fallback oracle
    function getOracleDeviationPct() external view returns (uint256);

    /// @notice The minimum USD value of an individual synthetic asset debt position.
    function getMinDebtValue() external view returns (uint256);
}
