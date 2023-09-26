// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {Asset, FeedConfiguration, OracleType} from "common/Types.sol";

interface IAssetConfigurationFacet {
    /**
     * @notice Adds a new asset to the system.
     * @notice Performs validations according to the config set.
     * @dev Use validatConfig or staticCall to validate config before calling this function.
     * @param _asset The asset address.
     * @param _config The configuration for the asset.
     * @custom:selector 0x575d5aca
     */
    function addAsset(address _asset, Asset memory _config, FeedConfiguration memory _feeds, bool setFeeds) external;

    /**
     * @notice Update asset config.
     * @notice Performs validations according to the config set.
     * @dev Use validatConfig or staticCall to validate config before calling this function.
     * @param _asset The asset address.
     * @param _config The configuration for the asset.
     * @custom:selector 0x575d5aca
     */
    function updateAsset(address _asset, Asset memory _config) external;

    /**
     * @notice Set feeds for an asset Id.
     * @param _assetId Asset id.
     * @param _feeds List oracle configuration containing oracle identifiers and feed addresses.
     * @custom:signature updateFeeds(address,(uint8[2],address[2]))
     * @custom:selector 0x3e05a061
     */
    function updateFeeds(bytes32 _assetId, FeedConfiguration memory _feeds) external;

    /**
     * @notice Validate asset config.
     * @param _asset The asset address.
     * @param _config The configuration for the asset.
     * @custom:signature validateAssetConfig(address,(bytes32,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,address,uint8[2],uint8,bool,bool,bool,bool,bool))
     * @custom:selector 0x24b7eb00
     */

    function validateAssetConfig(address _asset, Asset memory _config) external view;

    /**
     * @notice Set chainlink feeds for assetIds.
     * @dev Has modifiers: onlyRole.
     * @param _assets List of asset id's.
     * @param _feeds List of feed addresses.
     */
    function setChainlinkFeeds(bytes32[] calldata _assets, address[] calldata _feeds) external;

    /**
     * @notice Set api3 feeds for assetIds.
     * @dev Has modifiers: onlyRole.
     * @param _assets List of asset id's.
     * @param _feeds List of feed addresses.
     */
    function setApi3Feeds(bytes32[] calldata _assets, address[] calldata _feeds) external;

    /**
     * @notice Set chain link feed for an asset.
     * @param _asset The asset (bytes32).
     * @param _feed The feed address.
     * @custom:signature setChainLinkFeed(bytes32,address,address)
     * @custom:selector 0x0a924d27
     */
    function setChainLinkFeed(bytes32 _asset, address _feed) external;

    /**
     * @notice Set api3 feed address for an asset.
     * @param _asset The asset (bytes32).
     * @param _feed The feed address.
     * @custom:signature setApi3Feed(bytes32,address,address)
     * @custom:selector 0x581c79f5
     */
    function setApi3Feed(bytes32 _asset, address _feed) external;

    /**
     * @notice Update oracle order for an asset.
     * @param _asset The asset address.
     * @param _newOrder List of 2 OracleTypes.
     * @custom:signature updateOracleOrder(address,address[2])
     * @custom:selector 0x8697d24a
     */
    function updateOracleOrder(address _asset, OracleType[2] memory _newOrder) external;
}
