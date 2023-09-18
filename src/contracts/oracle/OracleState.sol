// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

struct OracleState {
    mapping(bytes32 => address) chainlinkFeeds;
    mapping(bytes32 => address) api3Feeds;
}
