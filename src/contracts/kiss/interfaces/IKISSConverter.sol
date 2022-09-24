// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

interface IKISSConverter {
    function operator() external returns (address);

    function fromKISS(address, uint256) external returns (uint256);

    function toKISS(address, uint256) external returns (uint256);
}
