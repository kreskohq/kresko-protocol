// SPDX-License-Identifier: MIT
/* solhint-disable no-inline-assembly */
/* solhint-disable avoid-low-level-calls */

pragma solidity 0.8.13;

import "../shared/Errors.sol";
import "../shared/Events.sol";
import "../shared/Meta.sol";
import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {DiamondState} from "./DiamondStructs.sol";

// Storage position
bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("kresko.diamond.storage");

library DiamondStorage {
    /// @notice Storage accessor
    /// @return ds_ Current state of `DiamondState`
    function state() internal pure returns (DiamondState storage ds_) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        /// @solidity memory-safe-assembly
        assembly {
            ds_.slot := position
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                         Initialization & Ownership                         */
    /* -------------------------------------------------------------------------- */

    /// @notice Ownership initializer
    /// @notice Only called on the first deployment
    function initialize(address _owner) internal {
        DiamondState storage s = state();
        require(!s.initialized, Error.ALREADY_INITIALIZED);
        s.initialized = true;
        s.storageVersion++;
        s.contractOwner = _owner;
        emit GeneralEvent.Deployed(_owner, s.storageVersion);
        emit AccessControlEvent.OwnershipTransferred(address(0), _owner);
    }

    /**
     * @dev Initiate ownership transfer to a new address
     * @param _newOwner address that is set as the pending new owner
     * @notice caller must be the current contract owner
     */
    function initiateOwnershipTransfer(address _newOwner) internal {
        DiamondState storage s = state();
        require(Meta.msgSender() == s.contractOwner, Error.DIAMOND_INVALID_OWNER);
        require(_newOwner != address(0), "DS: Owner cannot be 0-address");

        s.pendingOwner = _newOwner;

        emit AccessControlEvent.PendingOwnershipTransfer(s.contractOwner, _newOwner);
    }

    /**
     * @dev Transfer the ownership to the new pending owner
     * @notice caller must be the pending owner
     */
    function finalizeOwnershipTransfer() internal {
        DiamondState storage s = state();
        require(Meta.msgSender() == s.contractOwner, Error.DIAMOND_INVALID_PENDING_OWNER);
        s.contractOwner = s.pendingOwner;
        s.pendingOwner = address(0);

        emit AccessControlEvent.OwnershipTransferred(s.contractOwner, msg.sender);
    }

    /* -------------------------------------------------------------------------- */
    /*                             Internal DiamondCut                            */
    /* -------------------------------------------------------------------------- */

    function diamondCut(
        IDiamondCut.FacetCut[] memory _diamondCut,
        address _init,
        bytes memory _calldata
    ) internal {
        for (uint256 facetIndex; facetIndex < _diamondCut.length; facetIndex++) {
            IDiamondCut.FacetCutAction action = _diamondCut[facetIndex].action;
            if (action == IDiamondCut.FacetCutAction.Add) {
                addFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else if (action == IDiamondCut.FacetCutAction.Replace) {
                replaceFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else if (action == IDiamondCut.FacetCutAction.Remove) {
                removeFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else {
                revert("DiamondCut: Incorrect FacetCutAction");
            }
        }
        emit DiamondEvent.DiamondCut(_diamondCut, _init, _calldata);
        initializeDiamondCut(_init, _calldata);
    }

    function addFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        require(_functionSelectors.length > 0, "DiamondCut: No selectors in facet to cut");
        DiamondState storage s = state();
        require(_facetAddress != address(0), "DiamondCut: Add facet can't be address(0)");
        uint96 selectorPosition = uint96(s.facetFunctionSelectors[_facetAddress].functionSelectors.length);
        // add new facet address if it does not exist
        if (selectorPosition == 0) {
            addFacet(s, _facetAddress);
        }
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = s.selectorToFacetAndPosition[selector].facetAddress;
            require(oldFacetAddress == address(0), "DiamondCut: Can't add function that already exists");
            addFunction(s, selector, selectorPosition, _facetAddress);
            selectorPosition++;
        }
    }

    function replaceFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        require(_functionSelectors.length > 0, "DiamondCut: No selectors in facet to cut");
        DiamondState storage s = state();
        require(_facetAddress != address(0), "DiamondCut: Add facet can't be address(0)");
        uint96 selectorPosition = uint96(s.facetFunctionSelectors[_facetAddress].functionSelectors.length);
        // add new facet address if it does not exist
        if (selectorPosition == 0) {
            addFacet(s, _facetAddress);
        }
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = s.selectorToFacetAndPosition[selector].facetAddress;
            require(oldFacetAddress != _facetAddress, "DiamondCut: Can't replace function with same function");
            removeFunction(s, oldFacetAddress, selector);
            addFunction(s, selector, selectorPosition, _facetAddress);
            selectorPosition++;
        }
    }

    function removeFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        require(_functionSelectors.length > 0, "DiamondCut: No selectors in facet to cut");
        DiamondState storage s = state();
        // if function does not exist then do nothing and return
        require(_facetAddress == address(0), "DiamondCut: Remove facet address must be address(0)");
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = s.selectorToFacetAndPosition[selector].facetAddress;
            removeFunction(s, oldFacetAddress, selector);
        }
    }

    function addFacet(DiamondState storage s, address _facetAddress) internal {
        enforceHasContractCode(_facetAddress, "DiamondCut: New facet has no code");
        s.facetFunctionSelectors[_facetAddress].facetAddressPosition = s.facetAddresses.length;
        s.facetAddresses.push(_facetAddress);
    }

    function addFunction(
        DiamondState storage s,
        bytes4 _selector,
        uint96 _selectorPosition,
        address _facetAddress
    ) internal {
        s.selectorToFacetAndPosition[_selector].functionSelectorPosition = _selectorPosition;
        s.facetFunctionSelectors[_facetAddress].functionSelectors.push(_selector);
        s.selectorToFacetAndPosition[_selector].facetAddress = _facetAddress;
    }

    function removeFunction(
        DiamondState storage s,
        address _facetAddress,
        bytes4 _selector
    ) internal {
        require(_facetAddress != address(0), "DiamondCut: Can't remove function that doesn't exist");
        // an immutable function is a function defined directly in a diamond
        require(_facetAddress != address(this), "DiamondCut: Can't remove immutable function");
        // replace selector with last selector, then delete last selector
        uint256 selectorPosition = s.selectorToFacetAndPosition[_selector].functionSelectorPosition;
        uint256 lastSelectorPosition = s.facetFunctionSelectors[_facetAddress].functionSelectors.length - 1;
        // if not the same then replace _selector with lastSelector
        if (selectorPosition != lastSelectorPosition) {
            bytes4 lastSelector = s.facetFunctionSelectors[_facetAddress].functionSelectors[lastSelectorPosition];
            s.facetFunctionSelectors[_facetAddress].functionSelectors[selectorPosition] = lastSelector;
            s.selectorToFacetAndPosition[lastSelector].functionSelectorPosition = uint96(selectorPosition);
        }
        // delete the last selector
        s.facetFunctionSelectors[_facetAddress].functionSelectors.pop();
        delete s.selectorToFacetAndPosition[_selector];

        // if no more selectors for facet address then delete the facet address
        if (lastSelectorPosition == 0) {
            // replace facet address with last facet address and delete last facet address
            uint256 lastFacetAddressPosition = s.facetAddresses.length - 1;
            uint256 facetAddressPosition = s.facetFunctionSelectors[_facetAddress].facetAddressPosition;
            if (facetAddressPosition != lastFacetAddressPosition) {
                address lastFacetAddress = s.facetAddresses[lastFacetAddressPosition];
                s.facetAddresses[facetAddressPosition] = lastFacetAddress;
                s.facetFunctionSelectors[lastFacetAddress].facetAddressPosition = facetAddressPosition;
            }
            s.facetAddresses.pop();
            delete s.facetFunctionSelectors[_facetAddress].facetAddressPosition;
        }
    }

    function initializeDiamondCut(address _init, bytes memory _calldata) internal {
        if (_init == address(0)) {
            require(_calldata.length == 0, "DiamondCut: _init is address(0) but_calldata is not empty");
        } else {
            require(_calldata.length > 0, "DiamondCut: _calldata is empty but _init is not address(0)");
            if (_init != address(this)) {
                enforceHasContractCode(_init, "DiamondCut: _init address has no code");
            }
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

    /* -------------------------------------------------------------------------- */
    /*                                   Helpers                                  */
    /* -------------------------------------------------------------------------- */

    function enforceHasContractCode(address _contract, string memory _errorMessage) internal view {
        uint256 contractSize;
        /// @solidity memory-safe-assembly
        assembly {
            contractSize := extcodesize(_contract)
        }
        require(contractSize > 0, _errorMessage);
    }
}
