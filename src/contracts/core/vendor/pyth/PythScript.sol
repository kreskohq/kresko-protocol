// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VM} from "kresko-lib/utils/LibVM.s.sol";
import {IPyth} from "vendor/pyth/IPyth.sol";

struct Result {
    bytes32[] ids;
    IPyth.Price[] prices;
}

function getPythData(bytes32[] memory _ids) returns (Result memory result) {
    string[] memory args = new string[](2 + _ids.length);
    args[0] = "node";
    args[1] = "utils/pythPayload.mjs";
    for (uint256 i = 0; i < _ids.length; i++) {
        args[i + 2] = VM.toString(_ids[i]);
    }

    (bytes32[] memory ids, IPyth.Price[] memory prices) = abi.decode(VM.ffi(args), (bytes32[], IPyth.Price[]));
    return Result(ids, prices);
}
