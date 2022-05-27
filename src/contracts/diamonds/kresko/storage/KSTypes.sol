// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

/*
 * General kresko diamond storage
 */
struct KreskoStorage {
    // access control: sender -> facet contract -> bool
    mapping(address => mapping(address => bool)) operators;
    // owner of the contract
    address owner;
    // pending new owner
    address pendingOwner;
    // is the diamond initialized
    bool initialized;
    // domain separator
    bytes32 domainSeparator;
}
