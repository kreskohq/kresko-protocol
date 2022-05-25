// SPDX-License-Identifier: MIT
/* solhint-disable no-complex-fallback  */
/* solhint-disable no-inline-assembly */
/* solhint-disable no-empty-blocks */

pragma solidity 0.8.14;

import {DiamondStorage, DS} from "./storage/DS.sol";
import {IDiamondCut} from "./interfaces/IDiamondCut.sol";
import {LibMeta} from "helpers/LibMeta.sol";

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
        DS.initialize(_owner);
        DS.diamondCut(_diamondCut, address(0), "");

        for (uint256 i = 0; i < _initializations.length; i++) {
            DS.initializeDiamondCut(_initializations[i].initContract, _initializations[i].initData);
        }
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {
        DiamondStorage storage ds;
        bytes32 position = DS.DIAMOND_STORAGE_POSITION;
        // get diamond storage
        assembly {
            ds.slot := position
        }
        // get facet from function selectorsad
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "Diamond: Function does not exist");
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
