// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

/* ========================================================================== */
/*                                   STRUCTS                                  */
/* ========================================================================== */

struct FacetAddressAndPosition {
    address facetAddress;
    // position in facetFunctionSelectors.functionSelectors array
    uint96 functionSelectorPosition;
}

struct FacetFunctionSelectors {
    bytes4[] functionSelectors;
    // position of facetAddress in facetAddresses array
    uint256 facetAddressPosition;
}

struct RoleData {
    mapping(address => bool) members;
    bytes32 adminRole;
}
