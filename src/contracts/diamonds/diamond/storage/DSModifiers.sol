// SPDX-License-Identifier: MIT
pragma solidity >=0.8.11;

import {LibMeta} from "../../helpers/LibMeta.sol";
import {DS} from "./DS.sol";

contract DSModifiers {
    modifier onlyOwner() {
        require(LibMeta.msgSender() == DS.contractOwner(), "Diamond: Must be contract owner");
        _;
    }

    modifier onlyPendingOwner() {
        require(LibMeta.msgSender() == DS.pendingContractOwner(), "Diamond: Must be pending contract owner");
        _;
    }
}
