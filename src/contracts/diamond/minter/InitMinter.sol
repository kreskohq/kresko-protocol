// SPDX-License-Identifier: MIT

pragma solidity >=0.8.4;

import {MS} from "./storage/MS.sol";
import {LibMeta} from "../shared/libraries/LibMeta.sol";

import "hardhat/console.sol";

contract MainDiamondInit {
    function initialize() external {
        MS.MiStorage storage s = MS.s();
        require(!s.initialized, "MS: Already initialized");
        require(msg.sender == s.contractOwner, "MS: !Owner");

        s.domainSeparator = LibMeta.domainSeparator("Kresko Minter", "V1");
        s.initialized = true;
    }
}
