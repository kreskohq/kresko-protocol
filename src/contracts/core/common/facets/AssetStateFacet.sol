// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;
import {Redstone} from "libs/Redstone.sol";
import {EMPTY_BYTES12} from "common/Constants.sol";
import {CError} from "common/CError.sol";
import {Asset, OracleType} from "common/Types.sol";
import {aggregatorV3Price, API3Price} from "common/funcs/Prices.sol";
import {cs} from "common/State.sol";
import {IAssetStateFacet} from "common/interfaces/IAssetStateFacet.sol";

contract AssetStateFacet is IAssetStateFacet {
    /// @inheritdoc IAssetStateFacet
    function getAsset(address _asset) external view returns (Asset memory) {
        return cs().assets[_asset];
    }

    /// @inheritdoc IAssetStateFacet
    function getPrice(address _asset) external view returns (uint256) {
        return cs().assets[_asset].price();
    }

    /// @inheritdoc IAssetStateFacet
    function getValue(address _asset, uint256 amount) external view returns (uint256) {
        return cs().assets[_asset].uintUSD(amount);
    }

    /// @inheritdoc IAssetStateFacet
    function getFeedForId(bytes12 _underlyingId, OracleType _oracleType) external view returns (address) {
        return cs().oracles[_underlyingId][_oracleType].feed;
    }

    /// @inheritdoc IAssetStateFacet
    function getFeedForAddress(address _asset, OracleType _oracleType) external view returns (address) {
        return cs().oracles[cs().assets[_asset].underlyingId][_oracleType].feed;
    }

    /// @inheritdoc IAssetStateFacet
    function getPriceOfAsset(address _asset) external view returns (uint256) {
        if (cs().assets[_asset].underlyingId != EMPTY_BYTES12) {
            return cs().assets[_asset].price();
        }
        revert CError.INVALID_ASSET_ID(_asset);
    }

    /// @inheritdoc IAssetStateFacet
    function getChainlinkPrice(address _feed) external view returns (uint256) {
        return aggregatorV3Price(_feed);
    }

    /// @inheritdoc IAssetStateFacet
    function redstonePrice(bytes12 _underlyingId, address) external view returns (uint256) {
        return Redstone.getPrice(_underlyingId);
    }

    /// @inheritdoc IAssetStateFacet
    function getAPI3Price(address _feed) external view returns (uint256) {
        return API3Price(_feed);
    }
}
