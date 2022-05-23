// SPDX-License-Identifier: MIT

pragma solidity >=0.8.4;

import "./storage/KS.sol";

import {LibMeta} from "../shared/libraries/LibMeta.sol";

contract KreskoInit {
    function initialize() external {
        KrStorage storage s = KS.s();
        require(!s.initialized, "MS: Already initialized");
        require(msg.sender == s.contractOwner, "MS: !Owner");

        s.domainSeparator = LibMeta.domainSeparator("Kresko General", "V1");
        s.initialized = true;
    }
}
