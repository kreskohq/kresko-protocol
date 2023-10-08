# Solidity API

## SDIPrice

```solidity
function SDIPrice() internal view returns (uint256)
```

Get the price of SDI in USD, oracle precision.

## safePrice

```solidity
function safePrice(bytes12 _assetId, enum OracleType[2] _oracles, uint256 _oracleDeviationPct) internal view returns (uint256)
```

Get the oracle price using safety checks for deviation and sequencer uptime
reverts if the price deviates more than `_oracleDeviationPct`

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetId | bytes12 | The asset id |
| _oracles | enum OracleType[2] | The list of oracle identifiers |
| _oracleDeviationPct | uint256 | the deviation percentage |

## oraclePrice

```solidity
function oraclePrice(enum OracleType _oracleId, bytes12 _assetId) internal view returns (uint256)
```

Oracle price, a private view library function.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _oracleId | enum OracleType | The oracle id (uint8). |
| _assetId | bytes12 | The asset id (bytes12). |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 oracle price. |

## pushPrice

```solidity
function pushPrice(enum OracleType[2] _oracles, bytes12 _assetId) internal view returns (struct PushPrice)
```

Return push oracle price.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _oracles | enum OracleType[2] | The oracles defined. |
| _assetId | bytes12 | The asset id (bytes12). |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct PushPrice | PushPrice The push oracle price and timestamp. |

## deducePrice

```solidity
function deducePrice(uint256 _primaryPrice, uint256 _referencePrice, uint256 _oracleDeviationPct) internal pure returns (uint256)
```

Checks the primary and reference price for deviations.
Reverts if the price deviates more than `_oracleDeviationPct`

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _primaryPrice | uint256 | the primary price source to use |
| _referencePrice | uint256 | the reference price to compare primary against |
| _oracleDeviationPct | uint256 | the deviation percentage to use for the oracle |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Primary price if its within deviation range of reference price. Or the primary price is reference price is 0. Or the reference price if primary price is 0. Or revert if price deviates more than `_oracleDeviationPct` |

## handleSequencerDown

```solidity
function handleSequencerDown(enum OracleType[2] oracles, uint256[2] prices) internal pure returns (uint256)
```

## aggregatorV3Price

```solidity
function aggregatorV3Price(address _feedAddr) internal view returns (uint256)
```

Gets answer from AggregatorV3 type feed.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feedAddr | address | The feed address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Parsed answer from the feed, 0 if its stale. |

## aggregatorV3PriceWithTimestamp

```solidity
function aggregatorV3PriceWithTimestamp(address _feedAddr) internal view returns (struct PushPrice)
```

Gets answer from AggregatorV3 type feed with timestamp.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feedAddr | address | The feed address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct PushPrice | PushPrice Parsed answer and timestamp. |

## API3Price

```solidity
function API3Price(address _feedAddr) internal view returns (uint256)
```

Gets answer from IProxy type feed.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feedAddr | address | The feed address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Parsed answer from the feed, 0 if its stale. |

## API3PriceWithTimestamp

```solidity
function API3PriceWithTimestamp(address _feedAddr) internal view returns (struct PushPrice)
```

Gets answer from IProxy type feed with timestamp.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feedAddr | address | The feed address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct PushPrice | PushPrice Parsed answer and timestamp. |

## oraclePriceToWad

```solidity
function oraclePriceToWad(uint256 _priceOracleDecimals, uint8 _decimals) internal pure returns (uint256)
```

Converts an uint256 with oracleDecimals into a number with 18 decimals

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _priceOracleDecimals | uint256 | value with oracleDecimals |
| _decimals | uint8 | precision |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | wadPrice with 18 decimals |

## oraclePriceToWad

```solidity
function oraclePriceToWad(int256 _priceDecimalPrecision, uint8 _decimals) internal pure returns (uint256)
```

Converts an int256 with some decimal precision into a number with 18 decimals

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _priceDecimalPrecision | int256 | value with oracleDecimals |
| _decimals | uint8 | price precision |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | wadPrice price with 18 decimals |

## usdWad

```solidity
function usdWad(uint256 _amount, uint256 _price, uint8 _decimals) internal pure returns (uint256)
```

get some decimal precision USD value for `_amount`.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | amount of tokens to get USD value for. |
| _price | uint256 | amount of tokens to get USD value for. |
| _decimals | uint8 | precision |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | value USD value for `_amount` with `_decimals` precision. |

## divByPrice

```solidity
function divByPrice(uint256 _value, uint256 _priceWithOracleDecimals, uint8 _decimals) internal pure returns (uint256 wadValue)
```

Divides an uint256 @param _value with @param _priceWithOracleDecimals

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _value | uint256 | Left side value of the division |
| _priceWithOracleDecimals | uint256 |  |
| _decimals | uint8 | precision |

## wadToDecimal

```solidity
function wadToDecimal(uint256 _wadValue, uint8 _decimals) internal pure returns (uint256 value)
```

Converts an uint256 with wad precision into a number with @param _decimals precision

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _wadValue | uint256 | value with wad precision |
| _decimals | uint8 |  |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | with decimal precision |

