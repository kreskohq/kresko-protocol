// SPDX-License-Identifier: MIT
/* solhint-disable no-complex-fallback  */
/* solhint-disable no-inline-assembly */
/* solhint-disable no-empty-blocks */

pragma solidity 0.8.14;

import {AccessControl, DEFAULT_ADMIN_ROLE} from "./shared/AccessControl.sol";
import {ds, Meta, Error, initializeDiamondCut, IDiamondCut, GeneralEvent} from "./storage/DiamondStorage.sol";

contract Diamond {
    struct Initialization {
        address initContract;
        bytes initData;
    }

    constructor(
        address _owner,
        IDiamondCut.FacetCut[] memory _diamondCut,
        Initialization[] memory _initializations
    ) {
        ds().initialize(_owner);
        ds().diamondCut(_diamondCut, address(0), "");
        AccessControl._grantRole(DEFAULT_ADMIN_ROLE, _owner);

        ds().domainSeparator = Meta.domainSeparator("Kresko Protocol", "V1");

        for (uint256 i = 0; i < _initializations.length; i++) {
            initializeDiamondCut(_initializations[i].initContract, _initializations[i].initData);
        }

        emit GeneralEvent.Initialized(_owner, ds().storageVersion);
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