// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {GeneralEvent} from "../libs/Events.sol";
import {ISmockFacet} from "./interfaces/ISmockFacet.sol";
import {TEST_OPERATOR_ROLE} from "./SmockFacet.sol";
import {SmockStorage} from "./SmockStorage.sol";

contract SmockFacet2 {
    function initialize() external {
        SmockStorage.stateExtended().extended = true;
    }

    function getOldStructValueFromExtended() external view returns (bool) {
        return SmockStorage.stateExtended().initialized;
    }

    function getNewStructValueFromExtended() external view returns (bool) {
        return SmockStorage.stateExtended().extended;
    }
}
