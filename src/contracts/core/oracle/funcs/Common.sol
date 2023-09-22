// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Oracle, OracleType, OracleConfiguration} from "oracle/Types.sol";
import {OracleViewFacet} from "oracle/facets/OracleViewFacet.sol";
import {os} from "oracle/State.sol";
import {Error} from "common/Errors.sol";

function setChainLinkFeed(bytes32 _asset, address _feed, address _facet) {
    require(_feed != address(0), Error.ADDRESS_INVALID_ORACLE);
    os().oracles[_asset][OracleType.Chainlink] = Oracle(_feed, OracleViewFacet(_facet).chainlinkPrice);
}

function setApi3Feed(bytes32 _asset, address _feed, address _facet) {
    require(_feed != address(0), Error.ADDRESS_INVALID_ORACLE);
    os().oracles[_asset][OracleType.API3] = Oracle(_feed, OracleViewFacet(_facet).api3Price);
}

/**
 * @notice Set oracles for an asset.
 * @param _assetId Asset id.
 * @param _config List oracle configuration containing oracle identifiers and feed addresses.
 */
function setOraclesForAsset(bytes32 _assetId, OracleConfiguration memory _config, address _facet) {
    require(_config.oracleIds.length == _config.feeds.length, Error.ARRAY_OUT_OF_BOUNDS);
    for (uint256 i; i < _config.oracleIds.length; i++) {
        if (_config.oracleIds[i] == OracleType.Chainlink) {
            setChainLinkFeed(_assetId, _config.feeds[i], _facet);
        } else if (_config.oracleIds[i] == OracleType.API3) {
            setApi3Feed(_assetId, _config.feeds[i], _facet);
        }
        // redstone setup is implicit if it exists in the configuration
    }
}
