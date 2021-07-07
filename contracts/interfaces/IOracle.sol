// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IOracle {
    // Intended to be the rawValue of a FixedPoint.Unsigned, ie a number with 18 decimals.
    function value() external view returns (uint256);
}
