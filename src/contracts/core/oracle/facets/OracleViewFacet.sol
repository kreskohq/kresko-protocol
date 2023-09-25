//SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

import {IProxy} from "vendor/IProxy.sol";
import {Redstone} from "libs/Redstone.sol";
import {Error} from "common/Errors.sol";
import {aggregatorV3Price} from "common/funcs/Prices.sol";
import {ms} from "minter/State.sol";
import {os} from "oracle/State.sol";
import {OracleType} from "oracle/Types.sol";

contract OracleViewFacet {
    /**
     * @notice Get feed for an asset, an external view function.
     * @param _assetId The asset id (bytes32).
     * @param _oracleType The oracle type.
     * @return address address of chainlink feed.
     */
    function getFeedForId(bytes32 _assetId, OracleType _oracleType) external view returns (address) {
        return os().oracles[_assetId][_oracleType].feed;
    }

    function getFeedForAddress(address _asset, OracleType _oracleType) external view returns (address) {
        if (ms().collateralAssets[_asset].exists) {
            return os().oracles[ms().collateralAssets[_asset].id][_oracleType].feed;
        } else if (ms().kreskoAssets[_asset].exists) {
            return os().oracles[ms().kreskoAssets[_asset].id][_oracleType].feed;
        }
    }

    function getPriceOfAsset(address _asset) external view returns (uint256) {
        if (ms().collateralAssets[_asset].exists) {
            return ms().collateralAssets[_asset].price();
        } else if (ms().kreskoAssets[_asset].exists) {
            return ms().kreskoAssets[_asset].price();
        }
        revert(Error.INVALID_ASSET_SUPPLIED);
    }

    /**
     * @notice Gets Chainlink price
     * @param _feed feed address.
     * @return uint256 chainlink price.
     */
    function chainlinkPrice(address _feed) external view returns (uint256) {
        return aggregatorV3Price(_feed);
    }

    /**
     * @notice Gets Redstone price.
     * @param _assetId The asset id (bytes32).
     * @return uint256 redstone price.
     */
    function redstonePrice(bytes32 _assetId) external view returns (uint256) {
        return Redstone.getPrice(_assetId);
    }

    /**
     * @notice Gets API3 price.
     * @param _feed The feed address.
     * @return uint256 API3 price.
     */
    function api3Price(address _feed) external view returns (uint256) {
        (int256 answer, uint256 updatedAt) = IProxy(_feed).read();
        require(answer >= 0, Error.NEGATIVE_ORACLE_PRICE);
        // returning zero if oracle price is too old so that fallback oracle is used instead.
        if (block.timestamp - updatedAt > ms().oracleTimeout) {
            return 0;
        }
        return uint256(answer / 1e10);
    }
}
