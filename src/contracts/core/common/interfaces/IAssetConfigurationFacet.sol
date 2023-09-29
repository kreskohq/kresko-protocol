// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {Asset, FeedConfiguration, OracleType} from "common/Types.sol";

interface IAssetConfigurationFacet {
    /**
     * @notice Adds a new asset to the system.
     * @notice Performs validations according to the config set.
     * @dev Use validatConfig or staticCall to validate config before calling this function.
     * @param _assetAddr The asset address.
     * @param _config The configuration for the asset.
     * @param _feedConfig The feed configuration for the asset.
     * @param _setFeeds Whether to actually set feeds or not.
     * @custom:selector 0x575d5aca
     */
    function addAsset(address _assetAddr, Asset memory _config, FeedConfiguration memory _feedConfig, bool _setFeeds) external;

    /**
     * @notice Update asset config.
     * @notice Performs validations according to the config set.
     * @dev Use validatConfig or staticCall to validate config before calling this function.
     * @param _assetAddr The asset address.
     * @param _config The configuration for the asset.
     * @custom:selector 0x575d5aca
     */
    function updateAsset(address _assetAddr, Asset memory _config) external;

    /**
     * @notice Set feeds for an asset Id.
     * @param _assetId Asset id.
     * @param _feedConfig List oracle configuration containing oracle identifiers and feed addresses.
     * @custom:signature updateFeeds(address,(uint8[2],address[2]))
     * @custom:selector 0x3e05a061
     */
    function updateFeeds(bytes12 _assetId, FeedConfiguration memory _feedConfig) external;

    /**
     * @notice Validate supplied asset config. Reverts with information if invalid.
     * @param _assetAddr The asset address.
     * @param _config The configuration for the asset.
     * @custom:signature validateAssetConfig(address,(bytes32,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,address,uint8[2],uint8,bool,bool,bool,bool,bool))
     * @custom:selector 0x24b7eb00
     */

    function validateAssetConfig(address _assetAddr, Asset memory _config) external view;

    /**
     * @notice Set chainlink feeds for assetIds.
     * @dev Has modifiers: onlyRole.
     * @param _assetIds List of asset id's.
     * @param _feeds List of feed addresses.
     */
    function setChainlinkFeeds(bytes12[] calldata _assetIds, address[] calldata _feeds) external;

    /**
     * @notice Set api3 feeds for assetIds.
     * @dev Has modifiers: onlyRole.
     * @param _assetIds List of asset id's.
     * @param _feeds List of feed addresses.
     */
    function setApi3Feeds(bytes12[] calldata _assetIds, address[] calldata _feeds) external;

    /**
     * @notice Set chain link feed for an asset.
     * @param _assetId The asset (bytes32).
     * @param _feedAddr The feed address.
     * @custom:signature setChainLinkFeed(bytes32,address,address)
     * @custom:selector 0x0a924d27
     */
    function setChainLinkFeed(bytes12 _assetId, address _feedAddr) external;

    /**
     * @notice Set api3 feed address for an asset.
     * @param _assetId The asset (bytes32).
     * @param _feedAddr The feed address.
     * @custom:signature setApi3Feed(bytes32,address,address)
     * @custom:selector 0x581c79f5
     */
    function setApi3Feed(bytes12 _assetId, address _feedAddr) external;

    /**
     * @notice Update oracle order for an asset.
     * @param _assetAddr The asset address.
     * @param _newOracleOrder List of 2 OracleTypes. 0 is primary and 1 is the reference.
     * @custom:signature updateOracleOrder(address,address[2])
     * @custom:selector 0x8697d24a
     */
    function updateOracleOrder(address _assetAddr, OracleType[2] memory _newOracleOrder) external;
}
