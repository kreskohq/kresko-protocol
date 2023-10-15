// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

library NativeDataUtils {
    using LibBatch for bytes[];
    using LibBatch for bytes;

    function map(
        bytes[] memory rawData,
        function(bytes memory) pure returns (Proxy memory) dataHandler
    ) internal pure returns (Proxy[] memory result) {
        result = new Proxy[](rawData.length);
        unchecked {
            for (uint256 i; i < rawData.length; i++) {
                result[i] = dataHandler(rawData[i]);
            }
        }
    }

    function map(
        bytes[] memory rawData,
        function(bytes memory) pure returns (address) dataHandler
    ) internal pure returns (address[] memory result) {
        result = new address[](rawData.length);
        unchecked {
            for (uint256 i; i < rawData.length; i++) {
                result[i] = dataHandler(rawData[i]);
            }
        }
    }

    function toAddress(bytes memory b) internal pure returns (address) {
        return abi.decode(b, (address));
    }

    function toProxy(bytes memory b) internal pure returns (Proxy memory) {
        return abi.decode(b, (Proxy));
    }

    function toAddress(bytes32 b) internal pure returns (address) {
        return address(uint160(uint256(b)));
    }

    function toBytes32(address a) internal pure returns (bytes32) {
        return bytes32(bytes20(uint160(a)));
    }
}
