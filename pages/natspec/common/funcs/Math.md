# Solidity API

## valueToAmount

```solidity
function valueToAmount(uint16 _incentiveMultiplier, uint256 _price, uint256 _repayValue) internal pure returns (uint256)
```

Calculate amount for value provided with possible incentive multiplier for value.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _incentiveMultiplier | uint16 | The incentive multiplier (>= 1e18). |
| _price | uint256 | The price in USD for the output asset. |
| _repayValue | uint256 | Value to be converted to amount. |

## toWad

```solidity
function toWad(uint256 _decimals, uint256 _amount) internal pure returns (uint256)
```

For a given collateral asset and amount, returns a wad represenatation.

_If the collateral asset has decimals other than 18, the amount is scaled appropriately.
  If decimals > 18, there may be a loss of precision._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _decimals | uint256 | The collateral asset's number of decimals |
| _amount | uint256 | The amount of the collateral asset. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | A fp of amount scaled according to the collateral asset's decimals. |

## fromWad

```solidity
function fromWad(uint256 _decimals, uint256 _wadAmount) internal pure returns (uint256)
```

For a given collateral asset and wad amount, returns the collateral amount.

_If the collateral asset has decimals other than 18, the amount is scaled appropriately.
  If decimals < 18, there may be a loss of precision._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _decimals | uint256 | The collateral asset's number of decimals |
| _wadAmount | uint256 | The wad amount of the collateral asset. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An amount that is compatible with the collateral asset's decimals. |

