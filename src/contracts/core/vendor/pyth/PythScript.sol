// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VM} from "kresko-lib/utils/LibVm.s.sol";
import {IPyth} from "vendor/pyth/IPyth.sol";
import {JSON} from "scripts/deploy/libs/LibJSON.s.sol";

struct PythView {
    bytes32[] ids;
    IPyth.Price[] prices;
}

struct Output {
    bytes32[] ids;
    bytes[] updatedatas;
    IPyth.Price[] prices;
}

function getPythData(bytes32[] memory _ids) returns (bytes[] memory) {
    string[] memory args = new string[](3 + _ids.length);
    args[0] = "bun";
    args[1] = "--no-warnings";
    args[2] = "utils/pythPayload.js";
    for (uint256 i = 0; i < _ids.length; i++) {
        args[i + 3] = VM.toString(_ids[i]);
    }

    (, bytes[] memory updatedata, ) = abi.decode(VM.ffi(args), (bytes32[], bytes[], IPyth.Price[]));
    return updatedata;
}

function getPythData(JSON.Config memory cfg) returns (bytes[] memory) {
    (bytes32[] memory _assets, int64[] memory mockPrices) = cfg.getMockPrices();
    if (cfg.assets.mockFeeds) {
        return getMockPythPayload(_assets, mockPrices);
    }

    string[] memory args = new string[](3 + _assets.length);
    args[0] = "bun";
    args[1] = "--no-warnings";
    args[2] = "utils/pythPayload.js";
    for (uint256 i = 0; i < _assets.length; i++) {
        args[i + 3] = VM.toString(_assets[i]);
    }

    (, bytes[] memory updatedata, ) = abi.decode(VM.ffi(args), (bytes32[], bytes[], IPyth.Price[]));
    return updatedata;
}

function getPythData(string memory _ids) returns (bytes[] memory, PythView memory) {
    string[] memory args = new string[](4);

    args[0] = "bun";
    args[1] = "--no-warnings";
    args[2] = "utils/pythPayload.js";
    args[3] = _ids;

    (bytes32[] memory ids, bytes[] memory updatedata, IPyth.Price[] memory prices) = abi.decode(
        VM.ffi(args),
        (bytes32[], bytes[], IPyth.Price[])
    );
    return (updatedata, PythView(ids, prices));
}

function getMockPythPayload(bytes32[] memory _ids, int64[] memory _prices) view returns (bytes[] memory) {
    bytes[] memory _updateData = new bytes[](_ids.length);
    for (uint256 i = 0; i < _ids.length; i++) {
        _updateData[i] = abi.encode(_ids[i], IPyth.Price(_prices[i], uint64(_prices[i]) / 1000, -8, block.timestamp));
    }
    return _updateData;
}

function getPythViewData(bytes32[] memory _ids) returns (PythView memory result) {
    string[] memory args = new string[](3 + _ids.length);
    args[0] = "bun";
    args[1] = "--no-warnings";
    args[2] = "utils/pythPayload.js";
    for (uint256 i = 0; i < _ids.length; i++) {
        args[i + 3] = VM.toString(_ids[i]);
    }

    (bytes32[] memory ids, , IPyth.Price[] memory prices) = abi.decode(VM.ffi(args), (bytes32[], bytes[], IPyth.Price[]));
    return PythView(ids, prices);
}

function getMockPythViewPrices(JSON.Config memory cfg) view returns (PythView memory result) {
    (bytes32[] memory ids, int64[] memory prices) = cfg.getMockPrices();
    require(ids.length == prices.length, "PythScript: mock price length mismatch");
    result.ids = new bytes32[](ids.length);
    result.prices = new IPyth.Price[](ids.length);
    for (uint256 i = 0; i < prices.length; i++) {
        result.ids[i] = ids[i];
        result.prices[i] = IPyth.Price({price: prices[i], conf: 1, exp: -8, timestamp: block.timestamp});
    }
}

function getPythViewData(string memory _ids) returns (PythView memory result) {
    string[] memory args = new string[](4);

    args[0] = "bun";
    args[1] = "--no-warnings";
    args[2] = "utils/pythPayload.js";
    args[3] = _ids;

    (bytes32[] memory ids, , IPyth.Price[] memory prices) = abi.decode(VM.ffi(args), (bytes32[], bytes[], IPyth.Price[]));
    return PythView(ids, prices);
}
