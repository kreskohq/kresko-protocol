// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;
import {Meta} from "libs/Meta.sol";
import {DiamondEvent} from "common/Events.sol";
import {CError} from "common/CError.sol";
import {FacetCut, FacetCutAction} from "diamond/Types.sol";
import {DiamondState} from "diamond/State.sol";

// solhint-disable-next-line func-visibility
function initializeDiamondCut(address _init, bytes memory _calldata) {
    if (_init == address(0) && _calldata.length > 0) revert CError.DIAMOND_INIT_ADDRESS_ZERO_BUT_CALLDATA_NOT_EMPTY();
    if (_init != address(0)) {
        if (_calldata.length == 0) revert CError.DIAMOND_INIT_NOT_ZERO_BUT_CALLDATA_IS_EMPTY();
        Meta.enforceHasContractCode(_init);

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory error) = _init.delegatecall(_calldata);
        if (!success) {
            if (error.length > 0) {
                // bubble up the error
                revert(string(error));
            } else {
                revert CError.DIAMOND_INIT_FAILED(_init);
            }
        }
    }
}

library DCuts {
    /* -------------------------------------------------------------------------- */
    /*                              Diamond Functions                             */
    /* -------------------------------------------------------------------------- */

    function cut(DiamondState storage self, FacetCut[] memory _diamondCut, address _init, bytes memory _calldata) internal {
        for (uint256 facetIndex; facetIndex < _diamondCut.length; facetIndex++) {
            FacetCutAction action = _diamondCut[facetIndex].action;
            if (action == FacetCutAction.Add) {
                self.addFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else if (action == FacetCutAction.Replace) {
                self.replaceFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else if (action == FacetCutAction.Remove) {
                self.removeFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else {
                revert CError.DIAMOND_INCORRECT_FACET_CUT_ACTION();
            }
        }
        emit DiamondEvent.DiamondCut(_diamondCut, _init, _calldata);
        initializeDiamondCut(_init, _calldata);
    }

    function addFunctions(DiamondState storage self, address _facetAddress, bytes4[] memory _functionSelectors) internal {
        if (_functionSelectors.length == 0) revert CError.DIAMOND_NO_FACET_SELECTORS(_facetAddress);
        if (_facetAddress == address(0)) revert CError.ZERO_ADDRESS();

        uint96 selectorPosition = uint96(self.facetFunctionSelectors[_facetAddress].functionSelectors.length);
        // add new facet address if it does not exist
        if (selectorPosition == 0) {
            self.addFacet(_facetAddress);
        }
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = self.selectorToFacetAndPosition[selector].facetAddress;
            if (oldFacetAddress != address(0))
                revert CError.DIAMOND_FUNCTION_ALREADY_EXISTS(_facetAddress, oldFacetAddress, selector);
            self.addFunction(selector, selectorPosition, _facetAddress);
            selectorPosition++;
        }
    }

    function replaceFunctions(DiamondState storage self, address _facetAddress, bytes4[] memory _functionSelectors) internal {
        if (_functionSelectors.length == 0) revert CError.DIAMOND_NO_FACET_SELECTORS(_facetAddress);
        if (_facetAddress == address(0)) revert CError.ZERO_ADDRESS();

        uint96 selectorPosition = uint96(self.facetFunctionSelectors[_facetAddress].functionSelectors.length);
        // add new facet address if it does not exist
        if (selectorPosition == 0) {
            self.addFacet(_facetAddress);
        }
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = self.selectorToFacetAndPosition[selector].facetAddress;
            if (oldFacetAddress == _facetAddress) revert CError.DIAMOND_REPLACE_FUNCTION_DUPLICATE();
            self.removeFunction(oldFacetAddress, selector);
            self.addFunction(selector, selectorPosition, _facetAddress);
            selectorPosition++;
        }
    }

    function removeFunctions(DiamondState storage self, address _facetAddress, bytes4[] memory _functionSelectors) internal {
        if (_functionSelectors.length == 0) revert CError.DIAMOND_NO_FACET_SELECTORS(_facetAddress);
        // if function does not exist then do nothing and return
        if (_facetAddress != address(0)) revert CError.DIAMOND_REMOVE_FUNCTIONS_NONZERO_FACET_ADDRESS(_facetAddress);
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = self.selectorToFacetAndPosition[selector].facetAddress;
            self.removeFunction(oldFacetAddress, selector);
        }
    }

    function addFacet(DiamondState storage self, address _facetAddress) internal {
        Meta.enforceHasContractCode(_facetAddress);
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
        if (_facetAddress == address(0)) revert CError.DIAMOND_REMOVE_FUNCTION_FACET_IS_ZERO();
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
