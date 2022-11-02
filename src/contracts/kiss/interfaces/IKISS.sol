// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

interface IKISS {
    function operatorRoleTimestamp() external returns (uint256);

    function pendingOperator() external returns (address);

    function kresko() external returns (address);
}
