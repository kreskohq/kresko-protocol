# Solidity API

## KISS

### kresko

```solidity
address kresko
```

### vKISS

```solidity
address vKISS
```

### initialize

```solidity
function initialize(string name_, string symbol_, uint8 dec_, address admin_, address kresko_, address vKISS_) external
```

### onlyContract

```solidity
modifier onlyContract()
```

### issue

```solidity
function issue(uint256 _amount, address _to) public returns (uint256)
```

This function adds KISS to circulation
Caller must be a contract and have the OPERATOR_ROLE

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | amount to mint |
| _to | address | address to mint tokens to |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 amount minted |

### destroy

```solidity
function destroy(uint256 _amount, address _from) external returns (uint256)
```

This function removes KISS from circulation
Caller must be a contract and have the OPERATOR_ROLE

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | amount to burn |
| _from | address | address to burn tokens from |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 amount burned |

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
function vaultRedeem(address _asset, uint256 _shares, address _receiver, address _owner) external returns (uint256 assetsOut, uint256 assetFee)
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
| assetsOut | uint256 |  |
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
function withdrawFrom(address _from, address _to, uint256 _amount) public
```

Withdraw shares for equal amount of extender token with allowance.

_Does not return a value_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _from | address | address to burn extender tokens from |
| _to | address | address to send shares to |
| _amount | uint256 | amount to convert |

### pause

```solidity
function pause() public
```

Triggers stopped state.

Requirements:

- The contract must not be paused.

### unpause

```solidity
function unpause() public
```

Returns to normal state.

Requirements:

- The contract must be paused.

### grantRole

```solidity
function grantRole(bytes32 _role, address _to) public
```

Overrides `AccessControl.grantRole` for following:
EOA cannot be granted Role.OPERATOR role

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _role | bytes32 | role to grant |
| _to | address | address to grant role for |

### exchangeRate

```solidity
function exchangeRate() external view returns (uint256)
```

Exchange rate of vKISS to USD.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 |  |

### convertToShares

```solidity
function convertToShares(uint256 assets) external pure returns (uint256)
```

Returns the total amount of anchor tokens out

### convertToAssets

```solidity
function convertToAssets(uint256 shares) external pure returns (uint256)
```

Returns the total amount of krAssets out

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

Query if a contract implements an interface

_Interface identification is specified in ERC-165. This function
 uses less than 30,000 gas._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| interfaceId | bytes4 | The interface identifier, as specified in ERC-165 |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | `true` if the contract implements `interfaceID` and  `interfaceID` is not 0xffffffff, `false` otherwise |

### _withdraw

```solidity
function _withdraw(address _from, address _to, uint256 _amount) internal
```

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal
```

_See {ERC20-_beforeTokenTransfer}.

Requirements:

- the contract must not be paused._

