// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import {Script} from "forge-std/Script.sol";

abstract contract RedstoneHelper is Script {
    string internal scriptLocation = "./src/utils/getRedstonePayload.js";

    constructor(string memory _scriptLocation) {
        if (_scriptLocation != "") {
            scriptLocation = _scriptLocation;
        }
    }

    function getRedstonePayload(
        // dataFeedId:value:decimals
        string memory priceFeed
    ) public returns (bytes memory) {
        string[] memory args = new string[](3);
        args[0] = "node";
        args[1] = scriptLocation;
        args[2] = priceFeed;

        return vm.ffi(args);
    }
}
