// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {Asset, OracleType} from "common/Types.sol";

interface IAssetStateFacet {
    /**
     * @notice Get the state of a specific asset
     * @param _assetAddr Address of the asset.
     * @return State of assets `asset` struct
     */
    function getAsset(address _assetAddr) external view returns (Asset memory);

    /**
     * @notice Get price for an asset from address.
     * @param _assetAddr Asset address.
     * @return uint256 Current price for the asset.
     * @custom:signature getPrice(address)
     * @custom:selector 0x41976e09
     */
    function getPrice(address _assetAddr) external view returns (uint256);

    /**
     * @notice Get value for an asset amount using the current price.
     * @param _assetAddr Asset address.
     * @param _amount The amount (uint256).
     * @return uint256 Current value for `_amount` of `_assetAddr`.
     * @custom:signature getValue(address,uint256)
     * @custom:selector 0xc7bf8cf5
     */
    function getValue(address _assetAddr, uint256 _amount) external view returns (uint256);

    /**
     * @notice Gets the feed address for this underlying + oracle type.
     * @param _underlyingId The underlying asset id in 12 bytes.
     * @param _oracleType The oracle type.
     * @return feedAddr Feed address matching the oracle type given.
     */
    function getFeedForId(bytes12 _underlyingId, OracleType _oracleType) external view returns (address feedAddr);

    /**
     * @notice Gets corresponding feed address for the oracle type and asset address.
     * @param _assetAddr The asset address.
     * @param _oracleType The oracle type.
     * @return feedAddr Feed address that the asset uses with the oracle type.
     */
    function getFeedForAddress(address _assetAddr, OracleType _oracleType) external view returns (address feedAddr);

    /**
     * @notice Gets the deduced price in use from oracles defined for this asset address.
     * @param _assetAddr The asset address.
     * @return uint256 The current price.
     * @custom:signature getPriceOfAsset(address)
     * @custom:selector 0x0b13a88d
     */
    function getPriceOfAsset(address _assetAddr) external view returns (uint256);

    /**
     * @notice Price getter for AggregatorV3/Chainlink type feeds.
     * @notice Returns 0-price if answer is stale. This triggers the use of a secondary provider if available.
     * @dev Valid call will revert if the answer is negative.
     * @param _feedAddr AggregatorV3 type feed address.
     * @return uint256 Price answer from the feed, 0 if the price is stale.
     * @custom:signature getChainlinkPrice(address)
     * @custom:selector 0xbd58fe56
     */
    function getChainlinkPrice(address _feedAddr) external view returns (uint256);

    /**
     * @notice Price getter for Redstone, extracting the price from the supplied "hidden" calldata.
     * Reverts for a number of reasons, notably:
     * 1. Invalid calldata
     * 2. Not enough signers for the price data.
     * 2. Wrong signers for the price data.
     * 4. Stale price data.
     * 5. Not enough data points
     * @param _underlyingId The reference asset id (bytes32).
     * @return uint256 Extracted price with enough unique signers.
     * @custom:signature redstonePrice(bytes32,address)
     * @custom:selector 0x0acb75e3
     */
    function redstonePrice(bytes12 _underlyingId, address) external view returns (uint256);

    /**
     * @notice Price getter for IProxy/API3 type feeds.
     * @notice Decimal precision is NOT the same as other sources.
     * @notice Returns 0-price if answer is stale.This triggers the use of a secondary provider if available.
     * @dev Valid call will revert if the answer is negative.
     * @param _feedAddr IProxy type feed address.
     * @return uint256 Price answer from the feed, 0 if the price is stale.
     * @custom:signature getChainlinkPrice(address)
     * @custom:selector 0xbd58fe56
     */
    function getAPI3Price(address _feedAddr) external view returns (uint256);
}
