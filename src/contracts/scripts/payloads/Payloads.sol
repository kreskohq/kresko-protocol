// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {vmFFI} from "kresko-lib/utils/s/Base.s.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";

using LibDeploy for bytes;

function payloadSalt(string memory _id) pure returns (bytes32) {
    return bytes32(bytes(string.concat("payload-", (_id))));
}

function deployPayload(bytes memory _code, bytes memory _ctor, uint256 _id) returns (address) {
    return deployPayload(_code, _ctor, vmFFI.toString(_id));
}

function deployPayload(bytes memory _code, bytes memory _ctor, bytes32 _id) returns (address) {
    return deployPayload(_code, _ctor, vmFFI.toString(_id));
}

function deployPayload(bytes memory _code, bytes memory _ctor, string memory _id) returns (address location) {
    LibDeploy.JSONKey(string.concat("deployed-payload-", _id));
    location = _code.ctor(_ctor).d3("", payloadSalt(_id)).implementation;
    LibDeploy.saveJSONKey();
}
