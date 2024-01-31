// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VM} from "kresko-lib/utils/LibVM.s.sol";
import {IPyth} from "vendor/pyth/IPyth.sol";
import {console2} from "forge-std/console2.sol";
import {JSON} from "scripts/deploy/libs/LibDeployConfig.s.sol";

struct Result {
    bytes32[] ids;
    IPyth.Price[] prices;
}

struct Output {
    bytes32[] ids;
    bytes[] updatedatas;
    IPyth.Price[] prices;
}

function getPythData(bytes32[] memory _ids) returns (Output memory result) {
    string[] memory args = new string[](3 + _ids.length);
    args[0] = "node";
    args[1] = "--no-warnings";
    args[2] = "utils/pythPayload.mjs";
    for (uint256 i = 0; i < _ids.length; i++) {
        args[i + 3] = VM.toString(_ids[i]);
    }

    (bytes32[] memory ids, bytes[] memory updatedata, IPyth.Price[] memory prices) = abi.decode(
        VM.ffi(args),
        (bytes32[], bytes[], IPyth.Price[])
    );
    return Output(ids, updatedata, prices);
}

function getPythViewData(bytes32[] memory _ids) returns (Result memory result) {
    string[] memory args = new string[](3 + _ids.length);
    args[0] = "node";
    args[1] = "--no-warnings";
    args[2] = "utils/pythPayload.mjs";
    for (uint256 i = 0; i < _ids.length; i++) {
        args[i + 3] = VM.toString(_ids[i]);
    }

    (bytes32[] memory ids, , IPyth.Price[] memory prices) = abi.decode(VM.ffi(args), (bytes32[], bytes[], IPyth.Price[]));
    return Result(ids, prices);
}

function getMockPythViewData(JSON.Config memory cfg) view returns (Result memory result) {
    (bytes32[] memory ids, int64[] memory prices) = cfg.getMockPrices();
    require(ids.length == prices.length, "PythScript: mock price length mismatch");
    result.ids = new bytes32[](ids.length);
    result.prices = new IPyth.Price[](ids.length);
    for (uint256 i = 0; i < prices.length; i++) {
        result.ids[i] = ids[i];
        console2.logBytes32(ids[i]);
        result.prices[i] = IPyth.Price({price: prices[i], conf: 1, exp: -8, timestamp: block.timestamp});
    }
}

function getPythData(string memory _ids) returns (Output memory result) {
    string[] memory args = new string[](4);

    args[0] = "node";
    args[1] = "--no-warnings";
    args[2] = "utils/pythPayload.mjs";
    args[3] = _ids;

    (bytes32[] memory ids, bytes[] memory updatedata, IPyth.Price[] memory prices) = abi.decode(
        VM.ffi(args),
        (bytes32[], bytes[], IPyth.Price[])
    );
    return Output(ids, updatedata, prices);
}

function getPythViewData(string memory _ids) returns (Result memory result) {
    string[] memory args = new string[](4);

    args[0] = "node";
    args[1] = "--no-warnings";
    args[2] = "utils/pythPayload.mjs";
    args[3] = _ids;

    (bytes32[] memory ids, , IPyth.Price[] memory prices) = abi.decode(VM.ffi(args), (bytes32[], bytes[], IPyth.Price[]));

    console2.log("prices: %s", prices.length);
    return Result(ids, prices);
}
