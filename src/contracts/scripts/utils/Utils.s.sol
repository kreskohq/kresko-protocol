// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {VM} from "kresko-lib/utils/Libs.s.sol";

function getFFIPayload() returns (bytes memory) {
    string[] memory args = new string[](2);
    args[0] = "bun";
    args[1] = "run";
    args[2] = "./utils/rsPayloadProd.mjs";
    return VM.ffi(args);
}
