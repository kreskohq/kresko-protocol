# Solidity API

## ISCDPStateFacet

### getAccountScaledDepositsSCDP

```solidity
function getAccountScaledDepositsSCDP(address _account, address _depositAsset) external view returns (uint256)
```

Get the collateral pool deposit balance of `_account`. Including fees.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account. |
| _depositAsset | address | The deposit asset. |

### getAccountDepositSCDP

```solidity
function getAccountDepositSCDP(address _account, address _depositAsset) external view returns (uint256)
```

Get the total collateral principal deposits for `_account`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account. |
| _depositAsset | address | The deposit asset |

### getAccountDepositFeesGainedSCDP

```solidity
function getAccountDepositFeesGainedSCDP(address _account, address _depositAsset) external view returns (uint256)
```

### getAccountDepositValueSCDP

```solidity
function getAccountDepositValueSCDP(address _account, address _depositAsset) external view returns (uint256)
```

Get the (principal) deposit value for `_account`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account. |
| _depositAsset | address | The deposit asset |

### getAccountScaledDepositValueCDP

```solidity
function getAccountScaledDepositValueCDP(address _account, address _depositAsset) external view returns (uint256)
```

Get the full value of account and fees for `_account`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account. |
| _depositAsset | address | The collateral asset |

### getAccountTotalDepositsValueSCDP

```solidity
function getAccountTotalDepositsValueSCDP(address _account) external view returns (uint256)
```

Get the total collateral deposit value for `_account`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account. |

### getAccountTotalScaledDepositsValueSCDP

```solidity
function getAccountTotalScaledDepositsValueSCDP(address _account) external view returns (uint256)
```

Get the full value of account and fees for `_account`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account. |

### getDepositAssetsSCDP

```solidity
function getDepositAssetsSCDP() external view returns (address[])
```

Get all pool CollateralAssets

### getDepositsSCDP

```solidity
function getDepositsSCDP(address _collateralAsset) external view returns (uint256)
```

Get the total collateral deposits for `_collateralAsset`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collateralAsset | address | The collateral asset |

### getSwapDepositsSCDP

```solidity
function getSwapDepositsSCDP(address _collateralAsset) external view returns (uint256)
```

Get the total collateral swap deposits for `_collateralAsset`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collateralAsset | address | The collateral asset |

### getCollateralValueSCDP

```solidity
function getCollateralValueSCDP(address _depositAsset, bool _ignoreFactors) external view returns (uint256)
```

Get the total collateral deposit value for `_collateralAsset`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _depositAsset | address | The collateral asset |
| _ignoreFactors | bool | Ignore factors when calculating collateral and debt value. |

### getTotalCollateralValueSCDP

```solidity
function getTotalCollateralValueSCDP(bool _ignoreFactors) external view returns (uint256)
```

Get the total collateral value, oracle precision

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ignoreFactors | bool | Ignore factors when calculating collateral value. |

### getKreskoAssetsSCDP

```solidity
function getKreskoAssetsSCDP() external view returns (address[])
```

Get all pool KreskoAssets

### getDebtSCDP

```solidity
function getDebtSCDP(address _kreskoAsset) external view returns (uint256)
```

Get the collateral debt amount for `_kreskoAsset`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _kreskoAsset | address | The KreskoAsset |

### getDebtValueSCDP

```solidity
function getDebtValueSCDP(address _kreskoAsset, bool _ignoreFactors) external view returns (uint256)
```

Get the debt value for `_kreskoAsset`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _kreskoAsset | address | The KreskoAsset |
| _ignoreFactors | bool | Ignore factors when calculating collateral and debt value. |

### getTotalDebtValueSCDP

```solidity
function getTotalDebtValueSCDP(bool _ignoreFactors) external view returns (uint256)
```

Get the total debt value of krAssets in oracle precision

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ignoreFactors | bool | Ignore factors when calculating debt value. |

### getFeeRecipientSCDP

```solidity
function getFeeRecipientSCDP() external view returns (address)
```

Get the swap fee recipient

### getAssetEnabledSCDP

```solidity
function getAssetEnabledSCDP(address _asset) external view returns (bool)
```

Get enabled state of asset

### getSwapEnabledSCDP

```solidity
function getSwapEnabledSCDP(address _assetIn, address _assetOut) external view returns (bool)
```

Get whether swap is enabled from `_assetIn` to `_assetOut`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetIn | address | The asset to swap from |
| _assetOut | address | The asset to swap to |

### getCollateralRatioSCDP

```solidity
function getCollateralRatioSCDP() external view returns (uint256)
```

### getStatisticsSCDP

```solidity
function getStatisticsSCDP() external view returns (struct GlobalData)
```

Get pool collateral values and debt values with CR.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct GlobalData | GlobalData struct |

