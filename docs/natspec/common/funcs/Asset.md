# Solidity API

## CAsset

### price

```solidity
function price(struct Asset self) internal view returns (uint256)
```

### price

```solidity
function price(struct Asset self, uint256 oracleDeviationPct) internal view returns (uint256)
```

### pushedPrice

```solidity
function pushedPrice(struct Asset self) internal view returns (struct PushPrice)
```

### checkOracles

```solidity
function checkOracles(struct Asset self) internal view returns (struct PushPrice)
```

### uintUSD

```solidity
function uintUSD(struct Asset self, uint256 _amount) internal view returns (uint256)
```

Get value for @param _assetAmount of @param self in uint256

### redstonePrice

```solidity
function redstonePrice(struct Asset self) internal view returns (uint256)
```

Get the oracle price of an asset in uint256 with oracleDecimals

### marketStatus

```solidity
function marketStatus(struct Asset) internal pure returns (bool)
```

### ensureRepayValue

```solidity
function ensureRepayValue(struct Asset self, uint256 _maxRepayValue, uint256 _repayAmount) internal view returns (uint256 repayValue, uint256 repayAmount)
```

Ensure repayment value (and amount), clamp to max if necessary.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct Asset |  |
| _maxRepayValue | uint256 | The max liquidatable USD (uint256). |
| _repayAmount | uint256 | The repay amount (uint256). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| repayValue | uint256 | Effective repayment value. |
| repayAmount | uint256 | Effective repayment amount. |

### collateralAmountToValue

```solidity
function collateralAmountToValue(struct Asset self, uint256 _amount, bool _ignoreFactor) internal view returns (uint256 value)
```

Gets the collateral value for a single collateral asset and amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct Asset |  |
| _amount | uint256 | Amount of asset to get the value for. |
| _ignoreFactor | bool | Should collateral factor be ignored. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Value for `_amount` of the asset. |

### collateralAmountToValueWithPrice

```solidity
function collateralAmountToValueWithPrice(struct Asset self, uint256 _amount, bool _ignoreFactor) internal view returns (uint256 value, uint256 assetPrice)
```

Gets the collateral value for `_amount` and returns the price used.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct Asset |  |
| _amount | uint256 | Amount of asset |
| _ignoreFactor | bool | Should collateral factor be ignored. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Value for `_amount` of the asset. |
| assetPrice | uint256 | Price of the collateral asset. |

### debtAmountToValue

```solidity
function debtAmountToValue(struct Asset self, uint256 _amount, bool _ignoreKFactor) internal view returns (uint256 value)
```

Gets the USD value for a single Kresko asset and amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct Asset |  |
| _amount | uint256 | Amount of the Kresko asset to calculate the value for. |
| _ignoreKFactor | bool | Boolean indicating if the asset's k-factor should be ignored. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Value for the provided amount of the Kresko asset. |

### debtValueToAmount

```solidity
function debtValueToAmount(struct Asset self, uint256 _value, bool _ignoreKFactor) internal view returns (uint256 amount)
```

Gets the amount for a single debt asset and value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct Asset |  |
| _value | uint256 | Value of the asset to calculate the amount for. |
| _ignoreKFactor | bool | Boolean indicating if the asset's k-factor should be ignored. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Amount for the provided value of the Kresko asset. |

### debtAmountToSDI

```solidity
function debtAmountToSDI(struct Asset asset, uint256 amount, bool ignoreFactors) internal view returns (uint256 shares)
```

Preview SDI amount from krAsset amount.

### checkDust

```solidity
function checkDust(struct Asset _asset, uint256 _burnAmount, uint256 _debtAmount) internal view returns (uint256 amount)
```

Check that amount does not put the user's debt position below the minimum debt value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _asset | struct Asset | Asset being burned. |
| _burnAmount | uint256 | Debt amount burned. |
| _debtAmount | uint256 | Debt amount before burn. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | >= minDebtAmount |

### checkMinDebtValue

```solidity
function checkMinDebtValue(struct Asset _asset, address _kreskoAsset, uint256 _debtAmount) internal view
```

Checks min debt value against some amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _asset | struct Asset | The asset (Asset). |
| _kreskoAsset | address | The kresko asset address. |
| _debtAmount | uint256 | The debt amount (uint256). |

### minCollateralValueAtRatio

```solidity
function minCollateralValueAtRatio(struct Asset _krAsset, uint256 _amount, uint32 _ratio) internal view returns (uint256 minCollateralValue)
```

Get the minimum collateral value required to
back a Kresko asset amount at a given collateralization ratio.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _krAsset | struct Asset | Address of the Kresko asset. |
| _amount | uint256 | Kresko Asset debt amount. |
| _ratio | uint32 | Collateralization ratio for the minimum collateral value. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| minCollateralValue | uint256 | Minimum collateral value required for `_amount` of the Kresko Asset. |

### toRebasingAmount

```solidity
function toRebasingAmount(struct Asset self, uint256 _unrebasedAmount) internal view returns (uint256 maybeRebasedAmount)
```

Amount of non rebasing tokens -> amount of rebasing tokens

_DO use this function when reading values storage.
DONT use this function when writing to storage._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct Asset |  |
| _unrebasedAmount | uint256 | Unrebased amount to convert. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| maybeRebasedAmount | uint256 | Possibly rebased amount of asset |

### toNonRebasingAmount

```solidity
function toNonRebasingAmount(struct Asset self, uint256 _maybeRebasedAmount) internal view returns (uint256 maybeUnrebasedAmount)
```

Amount of rebasing tokens -> amount of non rebasing tokens

_DONT use this function when reading from storage.
DO use this function when writing to storage._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct Asset |  |
| _maybeRebasedAmount | uint256 | Possibly rebased amount of asset. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| maybeUnrebasedAmount | uint256 | Possibly unrebased amount of asset |

