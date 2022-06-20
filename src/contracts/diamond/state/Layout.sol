// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import {EnumerableSet} from "../../shared/EnumerableSet.sol";
import "./Structs.sol";
import "./Functions.sol";

/* -------------------------------------------------------------------------- */
/*                                 Main Layout                                */
/* -------------------------------------------------------------------------- */

struct DiamondState {
    /* -------------------------------------------------------------------------- */
    /*                                   Proxy                                    */
    /* -------------------------------------------------------------------------- */
    /// @notice Maps function selector to the facet address and
    /// the position of the selector in the facetFunctionSelectors.selectors array
    mapping(bytes4 => FacetAddressAndPosition) selectorToFacetAndPosition;
    /// @notice Maps facet addresses to function selectors
    mapping(address => FacetFunctionSelectors) facetFunctionSelectors;
    /// @notice Facet addresses
    address[] facetAddresses;
    /// @notice ERC165 query implementation
    mapping(bytes4 => bool) supportedInterfaces;
    /* -------------------------------------------------------------------------- */
    /*                               Initialization                               */
    /* -------------------------------------------------------------------------- */
    /// @notice Initialization status
    bool initialized;
    /// @notice Domain field separator
    bytes32 domainSeparator;
    /* -------------------------------------------------------------------------- */
    /*                                  Ownership                                 */
    /* -------------------------------------------------------------------------- */
    /// @notice Current owner of the diamond
    address contractOwner;
    /// @notice Pending new diamond owner
    address pendingOwner;
    /// @notice Storage version
    uint8 storageVersion;
    /// @notice address(this) replacement for FF
    address self;
    /* -------------------------------------------------------------------------- */
    /*                               Access Control                               */
    /* -------------------------------------------------------------------------- */
    mapping(bytes32 => RoleData) _roles;
    mapping(bytes32 => EnumerableSet.AddressSet) _roleMembers;
    /* -------------------------------------------------------------------------- */
    /*                                 Reentrancy                                 */
    /* -------------------------------------------------------------------------- */
    uint256 entered;
}

using {
    initialize,
    initiateOwnershipTransfer,
    finalizeOwnershipTransfer,
    diamondCut,
    addFunction,
    addFunctions,
    replaceFunctions,
    removeFunctions,
    addFacet,
    removeFunction
} for DiamondState global;
