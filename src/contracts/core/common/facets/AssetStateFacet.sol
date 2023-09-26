// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
import {Redstone} from "libs/Redstone.sol";
import {Error} from "common/Errors.sol";
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
    function getFeedForId(bytes32 _assetId, OracleType _oracleType) external view returns (address) {
        return cs().oracles[_assetId][_oracleType].feed;
    }

    /// @inheritdoc IAssetStateFacet
    function getFeedForAddress(address _asset, OracleType _oracleType) external view returns (address) {
        return cs().oracles[cs().assets[_asset].id][_oracleType].feed;
    }

    /// @inheritdoc IAssetStateFacet
    function getPriceOfAsset(address _asset) external view returns (uint256) {
        if (cs().assets[_asset].id != bytes32("")) {
            return cs().assets[_asset].price();
        }
        revert(Error.INVALID_ASSET_SUPPLIED);
    }

    /// @inheritdoc IAssetStateFacet
    function getChainlinkPrice(address _feed) external view returns (uint256) {
        return aggregatorV3Price(_feed);
    }

    /// @inheritdoc IAssetStateFacet
    function redstonePrice(bytes32 _assetId, address) external view returns (uint256) {
        return Redstone.getPrice(_assetId);
    }

    /// @inheritdoc IAssetStateFacet
    function getAPI3Price(address _feed) external view returns (uint256) {
        return API3Price(_feed);
    }
}
