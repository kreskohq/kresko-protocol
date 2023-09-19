//SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

import {ms} from "../../minter/MinterStorage.sol";
import {os} from "../OracleStorage.sol";
import {OracleType} from "../OracleState.sol";
import {AggregatorV3Interface} from "../../vendor/AggregatorV3Interface.sol";
import {LibRedstone} from "../../minter/libs/LibRedstone.sol";
import {IProxy} from "../interfaces/IProxy.sol";
import {Error} from "../../libs/Errors.sol";

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

    /**
     * @notice Gets Chainlink price
     * @param _feed feed address.
     * @return uint256 chainlink price.
     */
    function chainlinkPrice(address _feed) external view returns (uint256) {
        (, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(_feed).latestRoundData();
        require(answer >= 0, Error.NEGATIVE_ORACLE_PRICE);
        // returning zero if oracle price is too old so that fallback oracle is used instead.
        if (block.timestamp - updatedAt > ms().oracleTimeout) {
            return 0;
        }

        return uint256(answer);
    }

    /**
     * @notice Gets Redstone price.
     * @param _assetId The asset id (bytes32).
     * @return uint256 redstone price.
     */
    function redstonePrice(bytes32 _assetId, address) external view returns (uint256) {
        return LibRedstone.getPrice(_assetId);
    }

    /**
     * @notice Gets Api3 price.
     * @param _feed The feed address.
     * @return uint256 api3 price.
     */
    function api3Price(address _feed) external view returns (uint256) {
        (int256 answer, uint256 updatedAt) = IProxy(_feed).read();
        require(answer >= 0, Error.NEGATIVE_ORACLE_PRICE);
        // returning zero if oracle price is too old so that fallback oracle is used instead.
        // NOTE: there can be a case where both chainlink and api3 oracles are down, in that case 0 will be returned ???
        if (block.timestamp - updatedAt > ms().oracleTimeout) {
            return 0;
        }
        return uint256(answer / 1e10);
    }
}
