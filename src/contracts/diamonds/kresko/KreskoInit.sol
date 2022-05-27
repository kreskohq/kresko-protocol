// SPDX-License-Identifier: MIT

pragma solidity >=0.8.4;

import "./storage/KS.sol";

import {LibMeta} from "../helpers/LibMeta.sol";

contract KreskoInit {
    function initialize() external {
        KreskoStorage storage s = KS.s();
        require(!s.initialized, "MS: Already initialized");

        s.domainSeparator = LibMeta.domainSeparator("Kresko General", "V1");
        s.initialized = true;
    }
}
