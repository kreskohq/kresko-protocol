// SPDX-License-Identifier: MIT
/* solhint-disable no-complex-fallback  */
/* solhint-disable no-inline-assembly */
/* solhint-disable no-empty-blocks */

pragma solidity ^0.8.0;

import {Auth, Role} from "common/Auth.sol";
import {DiamondEvent} from "common/Events.sol";
import {Error} from "common/Errors.sol";

import {ds} from "./State.sol";
import {FacetCut, Initialization} from "./Types.sol";
import {initializeDiamondCut} from "./funcs/Cuts.sol";

contract Diamond {
    constructor(address _owner, FacetCut[] memory _diamondCut, Initialization[] memory _initializations) {
        ds().initialize(_owner);
        ds().cut(_diamondCut, address(0), "");
        Auth._grantRole(Role.ADMIN, _owner);

        for (uint256 i = 0; i < _initializations.length; i++) {
            initializeDiamondCut(_initializations[i].initContract, _initializations[i].initData);
        }

        emit DiamondEvent.Initialized(_owner, ds().storageVersion);
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {
        // get facet from function selectors
        address facet = ds().selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), Error.DIAMOND_INVALID_FUNCTION_SIGNATURE);
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
