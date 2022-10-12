// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

interface IKISS {
    function mint(address, uint256) external;

    function burn(address, uint256) external;
}
