// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 exp;
        uint256 timestamp;
    }

    function getPriceNoOlderThan(bytes32 _id, uint256 _maxAge) external view returns (Price memory);

    function getUpdateFee(bytes[] memory _updateData) external view returns (uint256);

    function updatePriceFeeds(bytes[] memory _updateData, bytes32[] memory _ids) external;

    function updatePriceFeedsIfNecessary(
        bytes[] memory _updateData,
        bytes32[] memory _ids,
        uint64[] memory _publishTimes
    ) external;
}
