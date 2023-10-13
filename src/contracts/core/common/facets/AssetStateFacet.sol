// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;
import {Strings} from "libs/Strings.sol";

import {IAssetStateFacet} from "common/interfaces/IAssetStateFacet.sol";
import {Enums, Constants} from "common/Constants.sol";
import {Errors} from "common/Errors.sol";
import {Asset} from "common/Types.sol";
import {cs} from "common/State.sol";

contract AssetStateFacet is IAssetStateFacet {
    using Strings for bytes32;

    /// @inheritdoc IAssetStateFacet
    function getAsset(address _assetAddr) external view returns (Asset memory) {
        return cs().assets[_assetAddr];
    }

    /// @inheritdoc IAssetStateFacet
    function getValue(address _assetAddr, uint256 _amount) external view returns (uint256) {
        return cs().assets[_assetAddr].uintUSD(_amount);
    }

    /// @inheritdoc IAssetStateFacet
    function getFeedForAddress(address _assetAddr, Enums.OracleType _oracleType) external view returns (address) {
        return cs().oracles[cs().assets[_assetAddr].ticker][_oracleType].feed;
    }

    /// @inheritdoc IAssetStateFacet
    function getPrice(address _assetAddr) external view returns (uint256) {
        if (cs().assets[_assetAddr].ticker != Constants.ZERO_BYTES32) {
            return cs().assets[_assetAddr].price();
        }
        revert Errors.INVALID_TICKER(Errors.id(_assetAddr), cs().assets[_assetAddr].ticker.toString());
    }
}
