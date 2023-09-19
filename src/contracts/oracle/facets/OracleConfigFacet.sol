//SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

import {DiamondModifiers, Role} from "../../diamond/DiamondModifiers.sol";
import {os} from "../OracleStorage.sol";

contract OracleConfigFacet is DiamondModifiers {
    /**
     * @notice Set chainlink feeds, an external state-modifying function.
     * @dev Has modifiers: onlyRole.
     * @param _assets List of bytes32.
     * @param _feeds List of addresses.
     */
    function setChainlinkFeeds(bytes32[] calldata _assets, address[] calldata _feeds) external onlyRole(Role.ADMIN) {
        require(_assets.length == _feeds.length, "assets-feeds-length");
        for (uint256 i; i < _assets.length; i++) {
            require(_feeds[i] != address(0), "feed-0");
            os().chainlinkFeeds[_assets[i]] = _feeds[i];
        }
    }

    /**
     * @notice Set api3 feeds, an external state-modifying function.
     * @dev Has modifiers: onlyRole.
     * @param _assets List of bytes32s.
     * @param _feeds List of addresses.
     */
    function setApi3Feeds(bytes32[] calldata _assets, address[] calldata _feeds) external onlyRole(Role.ADMIN) {
        require(_assets.length == _feeds.length, "assets-feeds-length");
        for (uint256 i; i < _assets.length; i++) {
            require(_feeds[i] != address(0), "feed-0");
            os().api3Feeds[_assets[i]] = _feeds[i];
        }
    }
}
