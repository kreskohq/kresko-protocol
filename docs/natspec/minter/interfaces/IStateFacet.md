# Solidity API

## IStateFacet

### getLiquidationThreshold

```solidity
function getLiquidationThreshold() external view returns (uint32)
```

The collateralization ratio at which positions may be liquidated.

### getMaxLiquidationRatio

```solidity
function getMaxLiquidationRatio() external view returns (uint32)
```

Multiplies max liquidation multiplier, if a full liquidation happens this is the resulting CR.

### getMinCollateralRatio

```solidity
function getMinCollateralRatio() external view returns (uint32)
```

The minimum ratio of collateral to debt that can be taken by direct action.

### getKrAssetExists

```solidity
function getKrAssetExists(address _krAsset) external view returns (bool)
```

simple check if kresko asset exists

### getCollateralExists

```solidity
function getCollateralExists(address _collateralAsset) external view returns (bool)
```

simple check if collateral asset exists

### getMinterParameters

```solidity
function getMinterParameters() external view returns (struct MinterParams)
```

get all meaningful protocol parameters

### getCollateralValueWithPrice

```solidity
function getCollateralValueWithPrice(address _collateralAsset, uint256 _amount) external view returns (uint256 value, uint256 adjustedValue, uint256 price)
```

Gets the USD value for a single collateral asset and amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collateralAsset | address | The address of the collateral asset. |
| _amount | uint256 | The amount of the collateral asset to calculate the value for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | The unadjusted value for the provided amount of the collateral asset. |
| adjustedValue | uint256 | The (cFactor) adjusted value for the provided amount of the collateral asset. |
| price | uint256 | The price of the collateral asset. |

### getDebtValueWithPrice

```solidity
function getDebtValueWithPrice(address _kreskoAsset, uint256 _amount) external view returns (uint256 value, uint256 adjustedValue, uint256 price)
```

Gets the USD value for a single Kresko asset and amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _kreskoAsset | address | The address of the Kresko asset. |
| _amount | uint256 | The amount of the Kresko asset to calculate the value for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | The unadjusted value for the provided amount of the debt asset. |
| adjustedValue | uint256 | The (kFactor) adjusted value for the provided amount of the debt asset. |
| price | uint256 | The price of the debt asset. |

