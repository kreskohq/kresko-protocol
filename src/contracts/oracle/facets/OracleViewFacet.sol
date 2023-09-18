//SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

import {DiamondModifiers, Role} from "../../diamond/DiamondModifiers.sol";
import {os} from "../OracleStorage.sol";
import {LibPrice} from "../libs/LibPrice.sol";

contract OracleViewFacet is DiamondModifiers {
    function getChainlinkFeed(bytes32 _asset) external view returns (address) {
        return os().chainlinkFeeds[_asset];
    }

    function getApi3Feed(bytes32 _asset) external view returns (address) {
        return os().api3Feeds[_asset];
    }
}
