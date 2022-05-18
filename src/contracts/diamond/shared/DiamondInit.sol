// SPDX-License-Identifier: MIT

pragma solidity >=0.8.4;

import {LibDiamond} from "./libraries/LibDiamond.sol";
import {IDiamondLoupe} from "./interfaces/IDiamondLoupe.sol";
import {IDiamondCut} from "./interfaces/IDiamondCut.sol";
import {IOwnership} from "./interfaces/IOwnership.sol";
import {IERC165} from "./interfaces/IERC165.sol";

import "hardhat/console.sol";

contract DiamondInit {
    function initialize() external {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        require(!ds.initialized, "LibDiamond: Already initialized");
        require(msg.sender == ds.contractOwner, "LibDiamond: !owner");

        ds.initialized = true;
    }
}
