//SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

import {os} from "../OracleStorage.sol";
import {OracleType} from "../OracleState.sol";

contract OracleViewFacet {
    /**
     * @notice Get chainlink feed address, an external view function.
     * @param _assetId The asset id (bytes32).
     * @return address address of chainlink feed.
     */
    function getChainlinkFeed(bytes32 _assetId) external view returns (address) {
        return os().oracles[_assetId][uint8(OracleType.Chainlink)].feed;
    }

    /**
     * @notice Get api3 feed, an external view function.
     * @param _assetId The asset id (bytes32).
     * @return address address of api3 feed.
     */
    function getApi3Feed(bytes32 _assetId) external view returns (address) {
        return os().oracles[_assetId][uint8(OracleType.Api3)].feed;
    }
}
