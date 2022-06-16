// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

/// @dev set the initial value to 1 as we do not
/// wanna hinder possible gas refunds by setting it to 0 on exit.

/* -------------------------------------------------------------------------- */
/*                                 Reentrancy                                 */
/* -------------------------------------------------------------------------- */
uint256 constant NOT_ENTERED = 1;
uint256 constant ENTERED = 2;
