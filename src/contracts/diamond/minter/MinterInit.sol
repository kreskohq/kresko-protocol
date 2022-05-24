// SPDX-License-Identifier: MIT

pragma solidity >=0.8.4;

import {MS, MinterStorage} from "./storage/MS.sol";
import {LibMeta} from "../helpers/LibMeta.sol";
import {MinterInitParams} from "./storage/MinterTypes.sol";

contract MinterInit is Initializable {
    function initialize(MinterInitParams params) external {
        require(!s.initialized, "MS: Already initialized");
        require(msg.sender == s.contractOwner, "MS: !Owner");

        s.domainSeparator = LibMeta.domainSeparator("Kresko Minter", "V1");
        s.initialized = true;
    }
}
