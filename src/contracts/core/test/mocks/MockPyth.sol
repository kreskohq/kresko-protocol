// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPyth} from "vendor/pyth/IPyth.sol";

contract MockPyth is IPyth {
    mapping(bytes32 => Price) internal prices;

    constructor(bytes[] memory _updateData) {
        for (uint256 i = 0; i < _updateData.length; i++) {
            _set(_updateData[i]);
        }
    }

    function getPriceNoOlderThan(bytes32 _id, uint256 _maxAge) external view override returns (Price memory) {
        if (prices[_id].timestamp >= block.timestamp - _maxAge) {
            return prices[_id];
        }
        revert("Pyth: price too old");
    }

    function getPriceUnsafe(bytes32 _id) external view override returns (Price memory) {
        return prices[_id];
    }

    function getUpdateFee(bytes[] memory _updateData) external pure override returns (uint256) {
        return _updateData.length;
    }

    function updatePriceFeeds(bytes[] memory _updateData) external payable {
        for (uint256 i = 0; i < _updateData.length; i++) {
            _set(_updateData[i]);
        }
    }

    function updatePriceFeedsIfNecessary(
        bytes[] memory _updateData,
        bytes32[] memory _ids,
        uint64[] memory _publishTimes
    ) external payable override {
        for (uint256 i = 0; i < _ids.length; i++) {
            if (prices[_ids[i]].timestamp < _publishTimes[i]) {
                _set(_updateData[i]);
            }
        }
    }

    function getMockPayload(bytes32[] memory _ids, int64[] memory _prices) external view returns (bytes[] memory) {
        bytes[] memory _updateData = new bytes[](_ids.length);
        for (uint256 i = 0; i < _ids.length; i++) {
            _updateData[i] = abi.encode(_ids[i], IPyth.Price(_prices[i], uint64(_prices[i]) / 1000, -8, block.timestamp));
        }
        return _updateData;
    }

    function _set(bytes memory _update) internal returns (bytes32 id, Price memory price) {
        (id, price) = abi.decode(_update, (bytes32, IPyth.Price));
        prices[id] = price;
    }
}

function createMockPyth(bytes32[] memory _ids, int64[] memory _prices) returns (MockPyth) {
    bytes[] memory _updateData = new bytes[](_ids.length);
    for (uint256 i = 0; i < _ids.length; i++) {
        _updateData[i] = abi.encode(_ids[i], IPyth.Price(_prices[i], uint64(_prices[i]) / 1000, -8, block.timestamp));
    }

    return new MockPyth(_updateData);
}
