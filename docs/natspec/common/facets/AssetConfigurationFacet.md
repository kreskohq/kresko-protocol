# Solidity API

## AssetConfigurationFacet

### addAsset

```solidity
function addAsset(address _assetAddr, struct Asset _config, struct FeedConfiguration _feedConfig, bool _setFeeds) external
```

Adds a new asset to the system.
Performs validations according to the config set.

_Use validatConfig or staticCall to validate config before calling this function._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | The asset address. |
| _config | struct Asset | The configuration for the asset. |
| _feedConfig | struct FeedConfiguration | The feed configuration for the asset. |
| _setFeeds | bool | Whether to actually set feeds or not. |

### updateAsset

```solidity
function updateAsset(address _assetAddr, struct Asset _config) external
```

Update asset config.
Performs validations according to the config set.

_Use validatConfig or staticCall to validate config before calling this function._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | The asset address. |
| _config | struct Asset | The configuration for the asset. |

### updateFeeds

```solidity
function updateFeeds(bytes12 _assetId, struct FeedConfiguration _feedConfig) public
```

Set feeds for an asset Id.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetId | bytes12 | Asset id. |
| _feedConfig | struct FeedConfiguration | List oracle configuration containing oracle identifiers and feed addresses. |

### setChainlinkFeeds

```solidity
function setChainlinkFeeds(bytes12[] _assetIds, address[] _feeds) public
```

Set chainlink feeds for assetIds.

_Has modifiers: onlyRole._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetIds | bytes12[] | List of asset id's. |
| _feeds | address[] | List of feed addresses. |

### setApi3Feeds

```solidity
function setApi3Feeds(bytes12[] _assetIds, address[] _feeds) public
```

Set api3 feeds for assetIds.

_Has modifiers: onlyRole._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetIds | bytes12[] | List of asset id's. |
| _feeds | address[] | List of feed addresses. |

### setChainLinkFeed

```solidity
function setChainLinkFeed(bytes12 _assetId, address _feedAddr) public
```

Set chain link feed for an asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetId | bytes12 | The asset (bytes12). |
| _feedAddr | address | The feed address. |

### setApi3Feed

```solidity
function setApi3Feed(bytes12 _assetId, address _feedAddr) public
```

Set api3 feed address for an asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetId | bytes12 | The asset (bytes12). |
| _feedAddr | address | The feed address. |

### updateOracleOrder

```solidity
function updateOracleOrder(address _assetAddr, enum OracleType[2] _newOracleOrder) external
```

Update oracle order for an asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | The asset address. |
| _newOracleOrder | enum OracleType[2] | List of 2 OracleTypes. 0 is primary and 1 is the reference. |

### validateAssetConfig

```solidity
function validateAssetConfig(address _assetAddr, struct Asset _config) external view
```

Validate supplied asset config. Reverts with information if invalid.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | The asset address. |
| _config | struct Asset | The configuration for the asset. |

### _validateMinterCollateral

```solidity
function _validateMinterCollateral(address _assetAddr, struct Asset _config) internal pure
```

### _validateMinterKrAsset

```solidity
function _validateMinterKrAsset(address _assetAddr, struct Asset _config) internal view
```

### _validateSCDPDepositAsset

```solidity
function _validateSCDPDepositAsset(address _assetAddr, struct Asset _config) internal pure
```

### _validateSCDPKrAsset

```solidity
function _validateSCDPKrAsset(address _assetAddr, struct Asset _config) internal pure
```

### validateLiqConfig

```solidity
function validateLiqConfig(address _assetAddr) public view
```

### _checkLiqPercents

```solidity
function _checkLiqPercents(address _seizeAssetAddr, struct Asset seizeAsset, address _repayAssetAddr, struct Asset repayAsset) internal view
```

