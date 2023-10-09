# Solidity API

## IAccountStateFacet

### ExpectedFeeRuntimeInfo

```solidity
struct ExpectedFeeRuntimeInfo {
  address[] assets;
  uint256[] amounts;
  uint256 collateralTypeCount;
}
```

### getAccountLiquidatable

```solidity
function getAccountLiquidatable(address _account) external view returns (bool)
```

Calculates if an account's current collateral value is under its minimum collateral value

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Indicates if the account can be liquidated. |

### getAccountState

```solidity
function getAccountState(address _account) external view returns (struct MinterAccountState)
```

Get accounts state in the Minter.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account address to get the state for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct MinterAccountState | MinterAccountState Total debt value, total collateral value and collateral ratio. |

### getAccountMintedAssets

```solidity
function getAccountMintedAssets(address _account) external view returns (address[])
```

Gets an array of Kresko assets the account has minted.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account to get the minted Kresko assets for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | address[] Array of Kresko Asset addresses the account has minted. |

### getAccountMintIndex

```solidity
function getAccountMintIndex(address _account, address _kreskoAsset) external view returns (uint256)
```

Gets an index for the Kresko asset the account has minted.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account to get the minted Kresko assets for. |
| _kreskoAsset | address | The asset lookup address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | index The index of asset in the minted assets array. |

### getAccountTotalDebtValues

```solidity
function getAccountTotalDebtValues(address _account) external view returns (uint256 value, uint256 valueAdjusted)
```

Gets the total Kresko asset debt value in USD for an account.
Adjusted value means it is multiplied by kFactor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account to calculate the Kresko asset value for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | The unadjusted value of debt. |
| valueAdjusted | uint256 | The kFactor adjusted value of debt. |

### getAccountTotalDebtValue

```solidity
function getAccountTotalDebtValue(address _account) external view returns (uint256)
```

Gets the total Kresko asset debt value in USD for an account.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account to calculate the Kresko asset value for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Total debt value of `_account`. |

### getAccountDebtAmount

```solidity
function getAccountDebtAmount(address _account, address _asset) external view returns (uint256)
```

Get `_account` debt amount for `_asset`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account to query amount for |
| _asset | address | The asset address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Amount of debt for `_asset` |

### getAccountCollateralValues

```solidity
function getAccountCollateralValues(address _account, address _asset) external view returns (uint256 value, uint256 valueAdjusted, uint256 price)
```

Get the unadjusted and the adjusted value of collateral deposits of `_asset` for `_account`.
Adjusted value means it is multiplied by cFactor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account to get the collateral values for. |
| _asset | address | Asset to get the collateral values for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Unadjusted value of the collateral deposits. |
| valueAdjusted | uint256 | cFactor adjusted value of the collateral deposits. |
| price | uint256 | Price for the collateral asset |

### getAccountTotalCollateralValue

```solidity
function getAccountTotalCollateralValue(address _account) external view returns (uint256 valueAdjusted)
```

Gets the adjusted collateral value of a particular account.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account to calculate the collateral value for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| valueAdjusted | uint256 | Collateral value of a particular account. |

### getAccountTotalCollateralValues

```solidity
function getAccountTotalCollateralValues(address _account) external view returns (uint256 value, uint256 valueAdjusted)
```

Gets the adjusted and unadjusted collateral value of `_account`.
Adjusted value means it is multiplied by cFactor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account to get the values for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Unadjusted total value of the collateral deposits. |
| valueAdjusted | uint256 | cFactor adjusted total value of the collateral deposits. |

### getAccountMinCollateralAtRatio

```solidity
function getAccountMinCollateralAtRatio(address _account, uint32 _ratio) external view returns (uint256)
```

Get an account's minimum collateral value required
to back a Kresko asset amount at a given collateralization ratio.

_Accounts that have their collateral value under the minimum collateral value are considered unhealthy,
     accounts with their collateral value under the liquidation threshold are considered liquidatable._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account to calculate the minimum collateral value for. |
| _ratio | uint32 | Collateralization ratio required: higher ratio = more collateral required |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Minimum collateral value of a particular account. |

### getAccountCollateralRatio

```solidity
function getAccountCollateralRatio(address _account) external view returns (uint256 ratio)
```

Get a list of accounts and their collateral ratios

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| ratio | uint256 | The collateral ratio of `_account` |

### getAccountCollateralRatios

```solidity
function getAccountCollateralRatios(address[] _accounts) external view returns (uint256[])
```

Get a list of account collateral ratios

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256[] | ratios Collateral ratios of the `_accounts` |

### getAccountDepositIndex

```solidity
function getAccountDepositIndex(address _account, address _collateralAsset) external view returns (uint256 i)
```

Gets an index for the collateral asset the account has deposited.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account to get the index for. |
| _collateralAsset | address | Asset address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| i | uint256 | Index of the minted collateral asset. |

### getAccountCollateralAssets

```solidity
function getAccountCollateralAssets(address _account) external view returns (address[])
```

Gets an array of collateral assets the account has deposited.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account to get the deposited collateral assets for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | address[] Array of collateral asset addresses the account has deposited. |

### getAccountCollateralAmount

```solidity
function getAccountCollateralAmount(address _account, address _asset) external view returns (uint256)
```

Get `_account` collateral deposit amount for `_asset`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account to query amount for |
| _asset | address | The asset address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Amount of collateral deposited for `_asset` |

### previewFee

```solidity
function previewFee(address _account, address _kreskoAsset, uint256 _kreskoAssetAmount, enum MinterFee _feeType) external view returns (address[] assets, uint256[] amounts)
```

Calculates the expected fee to be taken from a user's deposited collateral assets,
        by imitating calcFee without modifying state.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account to charge the open fee from. |
| _kreskoAsset | address | Address of the kresko asset being burned. |
| _kreskoAssetAmount | uint256 | Amount of the kresko asset being minted. |
| _feeType | enum MinterFee | Fee type (open or close). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | address[] | Collateral types as an array of addresses. |
| amounts | uint256[] | Collateral amounts as an array of uint256. |

