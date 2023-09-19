//SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

import {os} from "../OracleStorage.sol";

contract OracleViewFacet {
    function getChainlinkFeed(bytes32 _asset) external view returns (address) {
        return os().chainlinkFeeds[_asset];
    }

    function getApi3Feed(bytes32 _asset) external view returns (address) {
        return os().api3Feeds[_asset];
    }
}
