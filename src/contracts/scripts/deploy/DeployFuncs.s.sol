// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.21;

import {vmFFI} from "kresko-lib/utils/s/Base.s.sol";

function getFacetsAndSelectors() returns (string[] memory files, bytes[] memory facets, bytes4[][] memory selectors) {
    string[] memory cmd = new string[](2);
    cmd[0] = "./utils/getBytesAndSelectors.sh";
    cmd[1] = "./src/contracts/core/**/facets/*Facet.sol";

    (files, selectors) = abi.decode(vmFFI.ffi(cmd), (string[], bytes4[][]));
    facets = new bytes[](selectors.length);

    for (uint256 i; i < files.length; ) {
        (, bytes memory getCodeResult) = address(vmFFI).call(
            abi.encodeWithSignature("getCode(string)", string.concat(files[i], ".sol:", files[i]))
        );
        facets[i] = abi.decode(getCodeResult, (bytes));
        unchecked {
            i++;
        }
    }
    require(facets.length == selectors.length, "Facets and selectors length mismatch");
    return (files, facets, selectors);
}

function getFacetsAndSelectors(
    string memory artifact
) returns (string[] memory files, bytes[] memory facets, bytes4[][] memory selectors) {
    string[] memory cmd = new string[](2);
    cmd[0] = "./utils/getBytesAndSelectors.sh";
    cmd[1] = string.concat("./src/contracts/core/**/facets/", artifact, ".sol");

    (files, selectors) = abi.decode(vmFFI.ffi(cmd), (string[], bytes4[][]));
    facets = new bytes[](selectors.length);

    for (uint256 i; i < files.length; ) {
        (, bytes memory getCodeResult) = address(vmFFI).call(
            abi.encodeWithSignature("getCode(string)", string.concat(files[i], ".sol:", files[i]))
        );
        facets[i] = abi.decode(getCodeResult, (bytes));
        unchecked {
            i++;
        }
    }
    require(facets.length == selectors.length, "Facets and selectors length mismatch");
    return (files, facets, selectors);
}

function create1(bytes memory bytecode) returns (address location) {
    assembly {
        location := create(0, add(bytecode, 0x20), mload(bytecode))
    }
}
