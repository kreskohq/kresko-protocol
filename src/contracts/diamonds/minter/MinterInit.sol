// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {MS, MinterStorage} from "./storage/MS.sol";
import {LibMeta} from "../helpers/LibMeta.sol";
import {MinterInitParams} from "./storage/MinterTypes.sol";
import "../diamond/storage/DSModifiers.sol";

contract MinterInit is DSModifiers {
    function initialize(MinterInitParams calldata params) external onlyOwner {
        MinterStorage storage ms = MS.s();
        require(!ms.initialized, "MS: Already initialized");

        ms.domainSeparator = LibMeta.domainSeparator("Kresko Minter", "V1");
        ms.initialized = true;
        ms.version = 1;
    }
}
