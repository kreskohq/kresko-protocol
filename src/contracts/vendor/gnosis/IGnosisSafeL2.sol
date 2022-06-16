// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

interface IGnosisSafeL2 {
    function isOwner(address owner) external view returns (bool);
}
