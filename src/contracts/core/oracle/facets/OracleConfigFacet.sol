//SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Role} from "common/Types.sol";
import {DSModifiers} from "diamond/Modifiers.sol";
import {setChainLinkFeed, setApi3Feed} from "oracle/funcs/Common.sol";

contract OracleConfigFacet is DSModifiers {
    /**
     * @notice Set chainlink feeds, an external state-modifying function.
     * @dev Has modifiers: onlyRole.
     * @param _assets List of asset id's.
     * @param _feeds List of feed addresses.
     */
    function setChainlinkFeeds(bytes32[] calldata _assets, address[] calldata _feeds) external onlyRole(Role.ADMIN) {
        require(_assets.length == _feeds.length, "assets-feeds-length");
        for (uint256 i; i < _assets.length; i++) {
            setChainLinkFeed(_assets[i], _feeds[i], address(this));
        }
    }

    /**
     * @notice Set api3 feeds, an external state-modifying function.
     * @dev Has modifiers: onlyRole.
     * @param _assets List of asset id's.
     * @param _feeds List of feed addresses.
     */
    function setApi3Feeds(bytes32[] calldata _assets, address[] calldata _feeds) external onlyRole(Role.ADMIN) {
        require(_assets.length == _feeds.length, "assets-feeds-length");
        for (uint256 i; i < _assets.length; i++) {
            setApi3Feed(_assets[i], _feeds[i], address(this));
        }
    }
}
