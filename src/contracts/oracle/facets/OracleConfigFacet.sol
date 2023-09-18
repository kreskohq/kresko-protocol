//SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

import {DiamondModifiers, Role} from "../../diamond/DiamondModifiers.sol";
import {os} from "../OracleStorage.sol";

contract OracleConfigFacet is DiamondModifiers {
    function setChainlinkFeeds(bytes32[] calldata _assets, address[] calldata _feeds) external onlyRole(Role.ADMIN) {
        require(_assets.length == _feeds.length, "assets-feeds-length");
        for (uint256 i; i < _assets.length; i++) {
            require(_feeds[i] != address(0), "feed-0");
            os().chainlinkFeeds[_assets[i]] = _feeds[i];
        }
    }

    function setApi3Feeds(bytes32[] calldata _assets, address[] calldata _feeds) external onlyRole(Role.ADMIN) {
        require(_assets.length == _feeds.length, "assets-feeds-length");
        for (uint256 i; i < _assets.length; i++) {
            require(_feeds[i] != address(0), "feed-0");
            os().api3Feeds[_assets[i]] = _feeds[i];
        }
    }
}
