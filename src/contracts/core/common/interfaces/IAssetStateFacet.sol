// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {Asset, OracleType} from "common/Types.sol";

interface IAssetStateFacet {
    /**
     * @notice Get the state of a specific asset
     * @param _asset Address of the asset.
     * @return State of assets `asset` struct
     */
    function getAsset(address _asset) external view returns (Asset memory);

    function getPrice(address _asset) external view returns (uint256);

    function getValue(address _asset, uint256 amount) external view returns (uint256);

    /**
     * @notice Get feed for an asset, an external view function.
     * @param _assetId The asset id (bytes32).
     * @param _oracleType The oracle type.
     * @return address address of chainlink feed.
     */
    function getFeedForId(bytes32 _assetId, OracleType _oracleType) external view returns (address);

    /**
     * @notice Get feed for an asset, an external view function.
     * @param _asset The asset address.
     * @param _oracleType The oracle type.
     * @return address feed address
     */
    function getFeedForAddress(address _asset, OracleType _oracleType) external view returns (address);

    /**
     * @notice Get price of asset, an external view function.
     * @param _asset The asset address.
     * @return uint256 Result of getPriceOfAsset.
     * @custom:signature getPriceOfAsset(address)
     * @custom:selector 0x0b13a88d
     */
    function getPriceOfAsset(address _asset) external view returns (uint256);

    /**
     * @notice Chainlink price, an external view function.
     * @param _feed The feed address.
     * @return uint256 Result of chainlinkPrice.
     * @custom:signature getChainlinkPrice(address)
     * @custom:selector 0xbd58fe56
     */
    function getChainlinkPrice(address _feed) external view returns (uint256);

    /**
     * @notice Redstone price, an external view function.
     * @param _assetId The asset id (bytes32).
     * @return uint256 Result of redstonePrice.
     * @custom:signature redstonePrice(bytes32,address)
     * @custom:selector 0x0acb75e3
     */
    function redstonePrice(bytes32 _assetId, address) external view returns (uint256);

    /**
     * @notice Api3 price, an external view function.
     * @param _feed The feed address.
     * @return uint256 API3 Price
     * @custom:signature getAPI3Price(address)
     * @custom:selector 0xe939010d
     */

    function getAPI3Price(address _feed) external view returns (uint256);
}
