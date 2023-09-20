//SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

import {os} from "../OracleStorage.sol";
import {Oracle, OracleType} from "../OracleState.sol";
import {DiamondModifiers, Role} from "../../diamond/DiamondModifiers.sol";
import {OracleViewFacet} from "./OracleViewFacet.sol";

contract OracleConfigFacet is DiamondModifiers {
    /**
     * @notice Set chainlink feeds, an external state-modifying function.
     * @dev Has modifiers: onlyRole.
     * @param _assets List of asset id's.
     * @param _feeds List of feed addresses.
     */
    function setChainlinkFeeds(bytes32[] calldata _assets, address[] calldata _feeds) external onlyRole(Role.ADMIN) {
        require(_assets.length == _feeds.length, "assets-feeds-length");
        for (uint256 i; i < _assets.length; i++) {
            require(_feeds[i] != address(0), "feed-0");
            os().oracles[_assets[i]][uint8(OracleType.Chainlink)] = Oracle(
                _feeds[i],
                OracleViewFacet(address(this)).chainlinkPrice
            );
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
            require(_feeds[i] != address(0), "feed-0");
            os().oracles[_assets[i]][uint8(OracleType.Api3)] = Oracle(
                _feeds[i],
                OracleViewFacet(address(this)).api3Price
            );
        }
    }
}
