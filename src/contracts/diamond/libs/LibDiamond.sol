// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {Authorization} from "common/libs/Authorization.sol";
import {DiamondEvent} from "common/Events.sol";
import {IERC165} from "common/IERC165.sol";
import {IDiamondLoupeFacet} from "diamond/interfaces/IDiamondLoupeFacet.sol";
import {IDiamondOwnershipFacet} from "diamond/interfaces/IDiamondOwnershipFacet.sol";
import {IAuthorizationFacet} from "diamond/interfaces/IAuthorizationFacet.sol";
import {IDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {EnumerableSet} from "common/libs/EnumerableSet.sol";
import {GeneralEvent, AuthEvent} from "common/Events.sol";
import {Error} from "common/Errors.sol";
import {Meta} from "common/libs/Meta.sol";

// Storage position
bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("kresko.diamond.storage");

/**
 * @notice Ds, a pure free function.
 * @return state A DiamondState value.
 * @custom:signature ds()
 * @custom:selector 0x30dce62b
 */
function ds() pure returns (DiamondState storage state) {
    bytes32 position = DIAMOND_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}

/// @dev set the initial value to 1 as we do not
/// wanna hinder possible gas refunds by setting it to 0 on exit.

/* -------------------------------------------------------------------------- */
/*                                 Reentrancy                                 */
/* -------------------------------------------------------------------------- */
uint256 constant NOT_ENTERED = 1;
uint256 constant ENTERED = 2;

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

using LibDiamondCut for DiamondState global;
using LibOwnership for DiamondState global;

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
    bytes32 diamondDomainSeparator;
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

// solhint-disable-next-line func-visibility
function initializeDiamondCut(address _init, bytes memory _calldata) {
    if (_init == address(0)) {
        require(_calldata.length == 0, "DiamondCut: _init is address(0) but _calldata is not empty");
    } else {
        require(_calldata.length > 0, "DiamondCut: _calldata is empty but _init is not address(0)");
        Meta.enforceHasContractCode(_init, "DiamondCut: _init address has no code");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory error) = _init.delegatecall(_calldata);
        if (!success) {
            if (error.length > 0) {
                // bubble up the error
                revert(string(error));
            } else {
                revert("DiamondCut: _init function reverted");
            }
        }
    }
}

library LibDiamondCut {
    /* -------------------------------------------------------------------------- */
    /*                              Diamond Functions                             */
    /* -------------------------------------------------------------------------- */

    function cut(
        DiamondState storage self,
        IDiamondCutFacet.FacetCut[] memory _diamondCut,
        address _init,
        bytes memory _calldata
    ) internal {
        for (uint256 facetIndex; facetIndex < _diamondCut.length; facetIndex++) {
            IDiamondCutFacet.FacetCutAction action = _diamondCut[facetIndex].action;
            if (action == IDiamondCutFacet.FacetCutAction.Add) {
                self.addFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else if (action == IDiamondCutFacet.FacetCutAction.Replace) {
                self.replaceFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else if (action == IDiamondCutFacet.FacetCutAction.Remove) {
                self.removeFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else {
                revert("DiamondCut: Incorrect FacetCutAction");
            }
        }
        emit DiamondEvent.DiamondCut(_diamondCut, _init, _calldata);
        initializeDiamondCut(_init, _calldata);
    }

    function addFunctions(
        DiamondState storage self,
        address _facetAddress,
        bytes4[] memory _functionSelectors
    ) internal {
        require(_functionSelectors.length > 0, "DiamondCut: No selectors in facet to cut");
        require(_facetAddress != address(0), "DiamondCut: Add facet can't be address(0)");
        uint96 selectorPosition = uint96(self.facetFunctionSelectors[_facetAddress].functionSelectors.length);
        // add new facet address if it does not exist
        if (selectorPosition == 0) {
            self.addFacet(_facetAddress);
        }
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = self.selectorToFacetAndPosition[selector].facetAddress;
            require(oldFacetAddress == address(0), "DiamondCut: Can't add function that already exists");
            self.addFunction(selector, selectorPosition, _facetAddress);
            selectorPosition++;
        }
    }

    function replaceFunctions(
        DiamondState storage self,
        address _facetAddress,
        bytes4[] memory _functionSelectors
    ) internal {
        require(_functionSelectors.length > 0, "DiamondCut: No selectors in facet to cut");
        require(_facetAddress != address(0), "DiamondCut: Add facet can't be address(0)");
        uint96 selectorPosition = uint96(self.facetFunctionSelectors[_facetAddress].functionSelectors.length);
        // add new facet address if it does not exist
        if (selectorPosition == 0) {
            self.addFacet(_facetAddress);
        }
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = self.selectorToFacetAndPosition[selector].facetAddress;
            require(oldFacetAddress != _facetAddress, "DiamondCut: Can't replace function with same function");
            self.removeFunction(oldFacetAddress, selector);
            self.addFunction(selector, selectorPosition, _facetAddress);
            selectorPosition++;
        }
    }

    function removeFunctions(
        DiamondState storage self,
        address _facetAddress,
        bytes4[] memory _functionSelectors
    ) internal {
        require(_functionSelectors.length > 0, "DiamondCut: No selectors in facet to cut");
        // if function does not exist then do nothing and return
        require(_facetAddress == address(0), "DiamondCut: Remove facet address must be address(0)");
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = self.selectorToFacetAndPosition[selector].facetAddress;
            self.removeFunction(oldFacetAddress, selector);
        }
    }

    function addFacet(DiamondState storage self, address _facetAddress) internal {
        Meta.enforceHasContractCode(_facetAddress, "DiamondCut: New facet has no code");
        self.facetFunctionSelectors[_facetAddress].facetAddressPosition = self.facetAddresses.length;
        self.facetAddresses.push(_facetAddress);
    }

    function addFunction(
        DiamondState storage self,
        bytes4 _selector,
        uint96 _selectorPosition,
        address _facetAddress
    ) internal {
        self.selectorToFacetAndPosition[_selector].functionSelectorPosition = _selectorPosition;
        self.facetFunctionSelectors[_facetAddress].functionSelectors.push(_selector);
        self.selectorToFacetAndPosition[_selector].facetAddress = _facetAddress;
    }

    function removeFunction(DiamondState storage self, address _facetAddress, bytes4 _selector) internal {
        require(_facetAddress != address(0), "DiamondCut: Can't remove function that doesn't exist");
        // replace selector with last selector, then delete last selector
        uint256 selectorPosition = self.selectorToFacetAndPosition[_selector].functionSelectorPosition;
        uint256 lastSelectorPosition = self.facetFunctionSelectors[_facetAddress].functionSelectors.length - 1;
        // if not the same then replace _selector with lastSelector
        if (selectorPosition != lastSelectorPosition) {
            bytes4 lastSelector = self.facetFunctionSelectors[_facetAddress].functionSelectors[lastSelectorPosition];
            self.facetFunctionSelectors[_facetAddress].functionSelectors[selectorPosition] = lastSelector;
            self.selectorToFacetAndPosition[lastSelector].functionSelectorPosition = uint96(selectorPosition);
        }
        // delete the last selector
        self.facetFunctionSelectors[_facetAddress].functionSelectors.pop();
        delete self.selectorToFacetAndPosition[_selector];

        // if no more selectors for facet address then delete the facet address
        if (lastSelectorPosition == 0) {
            // replace facet address with last facet address and delete last facet address
            uint256 lastFacetAddressPosition = self.facetAddresses.length - 1;
            uint256 facetAddressPosition = self.facetFunctionSelectors[_facetAddress].facetAddressPosition;
            if (facetAddressPosition != lastFacetAddressPosition) {
                address lastFacetAddress = self.facetAddresses[lastFacetAddressPosition];
                self.facetAddresses[facetAddressPosition] = lastFacetAddress;
                self.facetFunctionSelectors[lastFacetAddress].facetAddressPosition = facetAddressPosition;
            }
            self.facetAddresses.pop();
            delete self.facetFunctionSelectors[_facetAddress].facetAddressPosition;
        }
    }
}

library LibOwnership {
    /* -------------------------------------------------------------------------- */
    /*                         Initialization & Ownership                         */
    /* -------------------------------------------------------------------------- */

    /// @notice Ownership initializer
    /// @notice Only called on the first deployment
    function initialize(DiamondState storage self, address _owner) internal {
        require(!self.initialized, Error.ALREADY_INITIALIZED);
        self.entered = NOT_ENTERED;
        self.initialized = true;
        self.storageVersion++;
        ds().diamondDomainSeparator = Meta.domainSeparator("Kresko Protocol", "V1");
        self.contractOwner = _owner;

        self.supportedInterfaces[type(IDiamondLoupeFacet).interfaceId] = true;
        self.supportedInterfaces[type(IERC165).interfaceId] = true;
        self.supportedInterfaces[type(IDiamondCutFacet).interfaceId] = true;
        self.supportedInterfaces[type(IDiamondOwnershipFacet).interfaceId] = true;
        self.supportedInterfaces[type(IAuthorizationFacet).interfaceId] = true;

        emit GeneralEvent.Deployed(_owner, self.storageVersion);
        emit AuthEvent.OwnershipTransferred(address(0), _owner);
    }

    /**
     * @dev Initiate ownership transfer to a new address
     * @param _newOwner address that is set as the pending new owner
     * @notice caller must be the current contract owner
     */
    function initiateOwnershipTransfer(DiamondState storage self, address _newOwner) internal {
        require(Meta.msgSender() == self.contractOwner, Error.DIAMOND_INVALID_OWNER);
        require(_newOwner != address(0), "DS: Owner cannot be 0-address");

        self.pendingOwner = _newOwner;

        emit AuthEvent.PendingOwnershipTransfer(self.contractOwner, _newOwner);
    }

    /**
     * @dev Transfer the ownership to the new pending owner
     * @notice caller must be the pending owner
     */
    function finalizeOwnershipTransfer(DiamondState storage self) internal {
        address sender = Meta.msgSender();
        require(sender == self.pendingOwner, Error.DIAMOND_INVALID_PENDING_OWNER);
        self.contractOwner = self.pendingOwner;
        self.pendingOwner = address(0);

        emit AuthEvent.OwnershipTransferred(self.contractOwner, sender);
    }
}

abstract contract DiamondModifiers {
    /**
     * @dev Modifier that checks that an account has a specific role. Reverts
     * with a standardized message including the required role.
     *
     * The format of the revert reason is given by the following regular expression:
     *
     *  /^Authorization: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/
     *
     * _Available since v4.1._
     */
    modifier onlyRole(bytes32 role) {
        Authorization.checkRole(role);
        _;
    }

    /**
     * @notice Ensure only trusted contracts can act on behalf of `_account`
     * @param _accountIsNotMsgSender The address of the collateral asset.
     */
    modifier onlyRoleIf(bool _accountIsNotMsgSender, bytes32 role) {
        if (_accountIsNotMsgSender) {
            Authorization.checkRole(role);
        }
        _;
    }

    modifier onlyOwner() {
        require(Meta.msgSender() == ds().contractOwner, Error.DIAMOND_INVALID_OWNER);
        _;
    }

    modifier onlyPendingOwner() {
        require(Meta.msgSender() == ds().pendingOwner, Error.DIAMOND_INVALID_PENDING_OWNER);
        _;
    }

    modifier nonReentrant() {
        require(ds().entered == NOT_ENTERED, Error.RE_ENTRANCY);
        ds().entered = ENTERED;
        _;
        ds().entered = NOT_ENTERED;
    }
}
