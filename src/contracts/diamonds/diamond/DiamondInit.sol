// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {DS, DiamondStorage} from "./storage/DS.sol";
import {LibMeta} from "../helpers/LibMeta.sol";

import {IDiamondLoupe} from "./interfaces/IDiamondLoupe.sol";
import {IDiamondCut} from "./interfaces/IDiamondCut.sol";
import {IOwnership} from "./interfaces/IOwnership.sol";
import {IERC165} from "./interfaces/IERC165.sol";

contract DiamondInit {
    function initialize() external {
        DiamondStorage storage s = DS.ds();
        require(!s.initialized, "DS: Already initialized");
        require(msg.sender == s.contractOwner, "DS: Only owner can call this function");

        s.domainSeparator = LibMeta.domainSeparator("Kresko Diamond", "V1");
        s.initialized = true;
    }
}
