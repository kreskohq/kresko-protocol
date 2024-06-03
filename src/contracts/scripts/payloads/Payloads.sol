// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {vmFFI} from "kresko-lib/utils/Base.s.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";

using LibDeploy for bytes;

function payloadSalt(uint256 _id) view returns (bytes32) {
    return bytes32(bytes(string.concat("payload-", vmFFI.toString(_id))));
}

function payloadSalt(bytes32 _id) view returns (bytes32) {
    return bytes32(bytes(string.concat("payload-", vmFFI.toString(_id))));
}

function deployPayload(bytes memory _code, bytes memory _ctor, uint256 _id) returns (address result) {
    LibDeploy.JSONKey(string.concat("Payload", vmFFI.toString(_id)));
    result = _code.ctor(_ctor).d3("", payloadSalt(_id)).implementation;
    LibDeploy.saveJSONKey();
}

function deployPayload(bytes memory _code, bytes memory _ctor, bytes32 _id) returns (address result) {
    LibDeploy.JSONKey(string.concat("Payload", vmFFI.toString(_id)));
    result = _code.ctor(_ctor).d3("", payloadSalt(_id)).implementation;
    LibDeploy.saveJSONKey();
}
