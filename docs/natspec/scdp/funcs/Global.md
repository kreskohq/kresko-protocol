# Solidity API

## SGlobal

### checkLiquidatableSCDP

```solidity
function checkLiquidatableSCDP(struct SCDPState self) internal view
```

Checks whether the shared debt pool can be liquidated.
Reverts if collateral value .

### checkCoverableSCDP

```solidity
function checkCoverableSCDP(struct SCDPState self) internal view
```

Checks whether the shared debt pool can be liquidated.
Reverts if collateral value .

### checkCollateralValue

```solidity
function checkCollateralValue(struct SCDPState self, uint32 _ratio) internal view
```

Checks whether the collateral value is less than minimum required.
Reverts when collateralValue is below minimum required.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _ratio | uint32 | Ratio to check in 1e4 percentage precision (uint32). |

### totalDebtValueAtRatioSCDP

```solidity
function totalDebtValueAtRatioSCDP(struct SCDPState self, uint32 _ratio, bool _ignorekFactor) internal view returns (uint256 totalValue)
```

Returns the value of the krAsset held in the pool at a ratio.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _ratio | uint32 | Percentage ratio to apply for the value in 1e4 percentage precision (uint32). |
| _ignorekFactor | bool | Whether to ignore kFactor |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalValue | uint256 | Total value in USD |

### totalCollateralValueSCDP

```solidity
function totalCollateralValueSCDP(struct SCDPState self, bool _ignoreFactors) internal view returns (uint256 totalValue)
```

Calculates the total collateral value of collateral assets in the pool.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _ignoreFactors | bool | Whether to ignore cFactor. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalValue | uint256 | Total value in USD |

### totalCollateralValueSCDP

```solidity
function totalCollateralValueSCDP(struct SCDPState self, address _collateralAsset, bool _ignoreFactors) internal view returns (uint256 totalValue, uint256 assetValue)
```

Calculates total collateral value while extracting single asset value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _collateralAsset | address | Collateral asset to extract value for |
| _ignoreFactors | bool | Whether to ignore cFactor. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalValue | uint256 | Total value in USD |
| assetValue | uint256 | Asset value in USD |

### totalDepositAmount

```solidity
function totalDepositAmount(struct SCDPState self, address _assetAddress, struct Asset _asset) internal view returns (uint128)
```

Get pool collateral deposits of an asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _assetAddress | address | The asset address |
| _asset | struct Asset | The asset struct |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint128 | Amount of scaled debt. |

### userDepositAmount

```solidity
function userDepositAmount(struct SCDPState self, address _assetAddress, struct Asset _asset) internal view returns (uint256)
```

Get pool user collateral deposits of an asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _assetAddress | address | The asset address |
| _asset | struct Asset | The asset struct |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Amount of scaled debt. |

### swapDepositAmount

```solidity
function swapDepositAmount(struct SCDPState self, address _assetAddress, struct Asset _asset) internal view returns (uint128)
```

Get "swap" collateral deposits.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _assetAddress | address | The asset address |
| _asset | struct Asset | The asset struct. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint128 | Amount of debt. |

