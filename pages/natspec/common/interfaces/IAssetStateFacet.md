# Solidity API

## IAssetStateFacet

### getAsset

```solidity
function getAsset(address _assetAddr) external view returns (struct Asset)
```

Get the state of a specific asset

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | Address of the asset. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct Asset | State of assets `asset` struct |

### getPrice

```solidity
function getPrice(address _assetAddr) external view returns (uint256)
```

Get price for an asset from address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | Asset address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Current price for the asset. |

### getValue

```solidity
function getValue(address _assetAddr, uint256 _amount) external view returns (uint256)
```

Get value for an asset amount using the current price.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | Asset address. |
| _amount | uint256 | The amount (uint256). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Current value for `_amount` of `_assetAddr`. |

### getFeedForId

```solidity
function getFeedForId(bytes12 _underlyingId, enum OracleType _oracleType) external view returns (address feedAddr)
```

Gets the feed address for this underlying + oracle type.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _underlyingId | bytes12 | The underlying asset id in 12 bytes. |
| _oracleType | enum OracleType | The oracle type. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| feedAddr | address | Feed address matching the oracle type given. |

### getFeedForAddress

```solidity
function getFeedForAddress(address _assetAddr, enum OracleType _oracleType) external view returns (address feedAddr)
```

Gets corresponding feed address for the oracle type and asset address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | The asset address. |
| _oracleType | enum OracleType | The oracle type. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| feedAddr | address | Feed address that the asset uses with the oracle type. |

### getPriceOfAsset

```solidity
function getPriceOfAsset(address _assetAddr) external view returns (uint256)
```

Gets the deduced price in use from oracles defined for this asset address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | The asset address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The current price. |

### getChainlinkPrice

```solidity
function getChainlinkPrice(address _feedAddr) external view returns (uint256)
```

Price getter for AggregatorV3/Chainlink type feeds.
Returns 0-price if answer is stale. This triggers the use of a secondary provider if available.

_Valid call will revert if the answer is negative._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feedAddr | address | AggregatorV3 type feed address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Price answer from the feed, 0 if the price is stale. |

### redstonePrice

```solidity
function redstonePrice(bytes12 _underlyingId, address) external view returns (uint256)
```

Price getter for Redstone, extracting the price from the supplied "hidden" calldata.
Reverts for a number of reasons, notably:
1. Invalid calldata
2. Not enough signers for the price data.
2. Wrong signers for the price data.
4. Stale price data.
5. Not enough data points

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _underlyingId | bytes12 | The reference asset id (bytes12). |
|  | address |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Extracted price with enough unique signers. |

### getAPI3Price

```solidity
function getAPI3Price(address _feedAddr) external view returns (uint256)
```

Price getter for IProxy/API3 type feeds.
Decimal precision is NOT the same as other sources.
Returns 0-price if answer is stale.This triggers the use of a secondary provider if available.

_Valid call will revert if the answer is negative._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feedAddr | address | IProxy type feed address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Price answer from the feed, 0 if the price is stale. |

