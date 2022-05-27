// SPDX-License-Identifier: MIT
pragma solidity >=0.8.11;

struct FacetAddressAndPosition {
    address facetAddress;
    uint96 functionSelectorPosition; // position in facetFunctionSelectors.functionSelectors array
}

struct FacetFunctionSelectors {
    bytes4[] functionSelectors;
    uint256 facetAddressPosition; // position of facetAddress in facetAddresses array
}

struct DiamondStorage {
    /* -------------------------------------------------------------------------- */
    /*                                  Ownership                                 */
    /* -------------------------------------------------------------------------- */
    /// @notice Current owner of the diamond
    address contractOwner;
    /// @notice Pending new diamond owner
    address pendingOwner;
    /* -------------------------------------------------------------------------- */
    /*                               Initialization                               */
    /* -------------------------------------------------------------------------- */

    /// @notice Initialization status
    bool initialized;
    /// @notice Domain field separator
    bytes32 domainSeparator;
    /// @notice Version
    uint8 version;
    /* -------------------------------------------------------------------------- */
    /*                                   Diamond                                  */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Maps function selector to the facet address and
     * the position of the selector in the facetFunctionSelectors.selectors array
     */
    mapping(bytes4 => FacetAddressAndPosition) selectorToFacetAndPosition;
    /// @notice Maps facet addresses to function selectors
    mapping(address => FacetFunctionSelectors) facetFunctionSelectors;
    /// @notice Facet addresses
    address[] facetAddresses;
    /// @notice ERC165 query implementation
    mapping(bytes4 => bool) supportedInterfaces;
}
