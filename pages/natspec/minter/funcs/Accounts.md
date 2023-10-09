# Solidity API

## MAccounts

### checkAccountLiquidatable

```solidity
function checkAccountLiquidatable(struct MinterState self, address _account) internal view
```

Checks if accounts collateral value is less than required.
Reverts if account is not liquidatable.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | Account to check. |

### isAccountLiquidatable

```solidity
function isAccountLiquidatable(struct MinterState self, address _account) internal view returns (bool)
```

Gets the liquidatable status of an account.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | Account to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Indicating if the account is liquidatable. |

### accountTotalDebtValue

```solidity
function accountTotalDebtValue(struct MinterState self, address _account) internal view returns (uint256 value)
```

Gets the total debt value in USD for an account.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | Account to calculate the KreskoAsset value for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Total kresko asset debt value of `_account`. |

### accountDebtAmount

```solidity
function accountDebtAmount(struct MinterState self, address _account, address _assetAddr, struct Asset _asset) internal view returns (uint256 debtAmount)
```

Gets `_account` principal debt amount for `_asset`

_Principal debt is rebase adjusted due to possible stock splits/reverse splits_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | Account to get debt amount for. |
| _assetAddr | address | Kresko asset address |
| _asset | struct Asset | Asset truct for the kresko asset. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| debtAmount | uint256 | Amount of debt the `_account` has for `_asset` |

### accountMintIndex

```solidity
function accountMintIndex(struct MinterState self, address _account, address _kreskoAsset) internal view returns (uint256 mintIndex)
```

Gets an index for the Kresko asset the account has minted.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | Account to get the minted Kresko assets for. |
| _kreskoAsset | address | Asset address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| mintIndex | uint256 | Index of the minted `_kreskoAsset` in the array for the `_account`. |

### accountDebtAssets

```solidity
function accountDebtAssets(struct MinterState self, address _account) internal view returns (address[] mintedAssets)
```

Gets an array of kresko assets the account has minted.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | Account to get the minted kresko assets for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| mintedAssets | address[] | Array of addresses of kresko assets the account has minted. |

### accountMinCollateralAtRatio

```solidity
function accountMinCollateralAtRatio(struct MinterState self, address _account, uint32 _ratio) internal view returns (uint256 minCollateralValue)
```

Gets accounts min collateral value required to cover debt at a given collateralization ratio.
Account with min collateral value under MCR cannot borrow.
Account with min collateral value under LT can be liquidated up to maxLiquidationRatio.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | Account to calculate the minimum collateral value for. |
| _ratio | uint32 | Collateralization ratio to apply for the minimum collateral value. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| minCollateralValue | uint256 | Minimum collateral value required for the account with `_ratio`. |

### accountCollateralAssets

```solidity
function accountCollateralAssets(struct MinterState self, address _account) internal view returns (address[] depositedAssets)
```

Gets the array of collateral assets the account has deposited.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | Account to get the deposited collateral assets for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| depositedAssets | address[] | Array of deposited collateral assets for `_account`. |

### accountCollateralAmount

```solidity
function accountCollateralAmount(struct MinterState self, address _account, address _assetAddress, struct Asset _asset) internal view returns (uint256)
```

Gets the deposited collateral asset amount for an account
Performs rebasing conversion for KreskoAssets

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | Account to query amount for |
| _assetAddress | address | Collateral asset address |
| _asset | struct Asset | Asset struct of the collateral asset |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Collateral deposit amount of `_asset` for `_account` |

### accountTotalCollateralValue

```solidity
function accountTotalCollateralValue(struct MinterState self, address _account) internal view returns (uint256 totalCollateralValue)
```

Gets the collateral value of a particular account.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | Account to calculate the collateral value for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalCollateralValue | uint256 | Collateral value of a particular account. |

### accountTotalCollateralValue

```solidity
function accountTotalCollateralValue(struct MinterState self, address _account, address _collateralAsset) internal view returns (uint256 totalValue, uint256 assetValue)
```

Gets the total collateral deposits value of an account while extracting value for `_collateralAsset`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | Account to calculate the collateral value for. |
| _collateralAsset | address | Collateral asset to extract value for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalValue | uint256 | Total collateral value of `_account` |
| assetValue | uint256 | Collateral value of `_collateralAsset` for `_account` |

### accountDepositIndex

```solidity
function accountDepositIndex(struct MinterState self, address _account, address _collateralAsset) internal view returns (uint256 depositIndex)
```

Gets the deposit index of `_collateralAsset` for `_account`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | Account to get the index for. |
| _collateralAsset | address | Collateral asset address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| depositIndex | uint256 | Index of the deposited asset in the array for `_account`. |

