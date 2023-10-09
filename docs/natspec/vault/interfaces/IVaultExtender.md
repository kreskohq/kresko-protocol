# Solidity API

## IVaultExtender

### Deposit

```solidity
event Deposit(address _from, address _to, uint256 _amount)
```

### Withdraw

```solidity
event Withdraw(address _from, address _to, uint256 _amount)
```

### vaultDeposit

```solidity
function vaultDeposit(address _asset, uint256 _assets, address _receiver) external returns (uint256 sharesOut, uint256 assetFee)
```

Deposit tokens to vault for shares and convert them to equal amount of extender token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _asset | address | Supported vault asset address |
| _assets | uint256 | amount of `_asset` to deposit |
| _receiver | address | Address receive extender tokens |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| sharesOut | uint256 | amount of shares/extender tokens minted |
| assetFee | uint256 | amount of `_asset` vault took as fee |

### vaultMint

```solidity
function vaultMint(address _asset, uint256 _shares, address _receiver) external returns (uint256 assetsIn, uint256 assetFee)
```

Deposit supported vault assets to receive `_shares`, depositing the shares for equal amount of extender token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _asset | address | Supported vault asset address |
| _shares | uint256 | Amount of shares to receive |
| _receiver | address | Address receive extender tokens |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assetsIn | uint256 | Amount of assets for `_shares` |
| assetFee | uint256 | Amount of `_asset` vault took as fee |

### vaultWithdraw

```solidity
function vaultWithdraw(address _asset, uint256 _assets, address _receiver, address _owner) external returns (uint256 sharesIn, uint256 assetFee)
```

Withdraw supported vault asset, burning extender tokens and withdrawing shares from vault.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _asset | address | Supported vault asset address |
| _assets | uint256 | amount of `_asset` to deposit |
| _receiver | address | Address receive extender tokens |
| _owner | address | Owner of extender tokens |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| sharesIn | uint256 | amount of shares/extender tokens burned |
| assetFee | uint256 | amount of `_asset` vault took as fee |

### vaultRedeem

```solidity
function vaultRedeem(address _asset, uint256 _shares, address _receiver, address _owner) external returns (uint256 sharesIn, uint256 assetFee)
```

Withdraw supported vault asset for  `_shares` of extender tokens.

_Does not return a value_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _asset | address | Token to deposit into vault for shares. |
| _shares | uint256 | amount of extender tokens to burn |
| _receiver | address | Address to receive assets withdrawn |
| _owner | address | Owner of extender tokens |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| sharesIn | uint256 | amount of shares/extender tokens minted |
| assetFee | uint256 | amount of `_asset` vault took as fee |

### deposit

```solidity
function deposit(uint256 _shares, address _receiver) external
```

Deposit shares for equal amount of extender token.

_Does not return a value_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _shares | uint256 | amount of vault shares to deposit |
| _receiver | address | address to mint extender tokens to |

### withdraw

```solidity
function withdraw(uint256 _amount, address _receiver) external
```

Withdraw shares for equal amount of extender token.

_Does not return a value_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | amount of vault extender tokens to burn |
| _receiver | address | address to send shares to |

### withdrawFrom

```solidity
function withdrawFrom(address _from, address _to, uint256 _amount) external
```

Withdraw shares for equal amount of extender token with allowance.

_Does not return a value_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _from | address | address to burn extender tokens from |
| _to | address | address to send shares to |
| _amount | uint256 | amount to convert |

