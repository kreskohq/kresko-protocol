# Solidity API

## totalCollateralValuesSCDP

```solidity
function totalCollateralValuesSCDP() internal view returns (uint256 value, uint256 valueAdjusted)
```

Calculates the total collateral value of collateral assets in the pool.

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | in USD |
| valueAdjusted | uint256 | Value adjusted by cFactors in USD |

## totalDebtValuesAtRatioSCDP

```solidity
function totalDebtValuesAtRatioSCDP(uint32 _ratio) internal view returns (uint256 value, uint256 valueAdjusted)
```

Returns the values of the krAsset held in the pool at a ratio.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ratio | uint32 | ratio |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | in USD |
| valueAdjusted | uint256 | Value adjusted by kFactors in USD |

## accountTotalDepositValues

```solidity
function accountTotalDepositValues(address _account, address[] _assetData) internal view returns (uint256 totalValue, uint256 totalScaledValue, struct UserAssetData[] datas)
```

## accountDepositAmountsAndValues

```solidity
function accountDepositAmountsAndValues(address _account, address _assetAddr) internal view returns (struct UserAssetData result)
```

