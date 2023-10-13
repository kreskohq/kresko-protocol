// SPDX-License-Identifier: MIT
/* solhint-disable no-complex-fallback  */
/* solhint-disable no-inline-assembly */
/* solhint-disable no-empty-blocks */

pragma solidity ^0.8.0;

import {FacetCut, Initializer} from "./DSTypes.sol";
import {DSCore} from "./DSCore.sol";
import {ds} from "./DState.sol";

contract Diamond {
    constructor(address owner, FacetCut[] memory facets, Initializer[] memory initializers) {
        DSCore.create(facets, initializers, owner);
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {
        // get facet from function selectors
        address facet = ds().selectorToFacetAndPosition[msg.sig].facetAddress;

        if (facet == address(0)) revert DSCore.DIAMOND_FUNCTION_DOES_NOT_EXIST(msg.sig);

        // Execute external function from facet using delegatecall and return any value.
        assembly {
            // copy function selector and any arguments
            calldatacopy(0, 0, calldatasize())
            // execute function call using the facet
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            // get any return value
            returndatacopy(0, 0, returndatasize())
            // return any return value or error back to the caller
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    receive() external payable {}
}
