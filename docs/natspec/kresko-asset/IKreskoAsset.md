# Solidity API

## ISyncable

### sync

```solidity
function sync() external
```

## IKreskoAsset

### Rebase

Rebase information

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct Rebase {
  bool positive;
  uint256 denominator;
}
```

### initialize

```solidity
function initialize(string _name, string _symbol, uint8 _decimals, address _admin, address _kresko, address _underlying, address _feeRecipient, uint48 _openFee, uint40 _closeFee) external
```

Initializes a KreskoAsset ERC20 token.

_Intended to be operated by the Kresko smart contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _name | string | The name of the KreskoAsset. |
| _symbol | string | The symbol of the KreskoAsset. |
| _decimals | uint8 | Decimals for the asset. |
| _admin | address | The adminstrator of this contract. |
| _kresko | address | The protocol, can perform mint and burn. |
| _underlying | address | The underlying token if available. |
| _feeRecipient | address | Fee recipient for synth wraps. |
| _openFee | uint48 | Synth warp open fee. |
| _closeFee | uint40 | Synth wrap close fee. |

### kresko

```solidity
function kresko() external view returns (address)
```

### rebaseInfo

```solidity
function rebaseInfo() external view returns (struct IKreskoAsset.Rebase)
```

### isRebased

```solidity
function isRebased() external view returns (bool)
```

### rebase

```solidity
function rebase(uint256 _denominator, bool _positive, address[] _pools) external
```

Perform a rebase, changing the denumerator and its operator

_denumerator values 0 and 1 ether will disable the rebase_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _denominator | uint256 | the denumerator for the operator, 1 ether = 1 |
| _positive | bool | supply increasing/reducing rebase |
| _pools | address[] | UniswapV2Pair address to sync so we wont get rekt by skim() calls. |

### reinitializeERC20

```solidity
function reinitializeERC20(string _name, string _symbol, uint8 _version) external
```

Updates ERC20 metadata for the token in case eg. a ticker change

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _name | string | new name for the asset |
| _symbol | string | new symbol for the asset |
| _version | uint8 | number that must be greater than latest emitted `Initialized` version |

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

Returns the total supply of the token.
This amount is adjusted by rebases.

### balanceOf

```solidity
function balanceOf(address _account) external view returns (uint256)
```

Returns the balance of @param _account
This amount is adjusted by rebases.

### allowance

```solidity
function allowance(address _owner, address _account) external view returns (uint256)
```

### approve

```solidity
function approve(address spender, uint256 amount) external returns (bool)
```

### transfer

```solidity
function transfer(address _to, uint256 _amount) external returns (bool)
```

### transferFrom

```solidity
function transferFrom(address _from, address _to, uint256 _amount) external returns (bool)
```

### mint

```solidity
function mint(address _to, uint256 _amount) external
```

Mints tokens to an address.

_Only callable by operator.
Internal balances are always unrebased, events emitted are not._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _to | address | The address to mint tokens to. |
| _amount | uint256 | The amount of tokens to mint. |

### burn

```solidity
function burn(address _from, uint256 _amount) external
```

Burns tokens from an address.

_Only callable by operator.
Internal balances are always unrebased, events emitted are not._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _from | address | The address to burn tokens from. |
| _amount | uint256 | The amount of tokens to burn. |

### pause

```solidity
function pause() external
```

Triggers stopped state.

Requirements:

- The contract must not be paused.

### unpause

```solidity
function unpause() external
```

Returns to normal state.

Requirements:

- The contract must be paused.

### wrap

```solidity
function wrap(address _to, uint256 _amount) external
```

Deposit underlying tokens to receive equal value of krAsset (-fee).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _to | address | The to address. |
| _amount | uint256 | The amount (uint256). |

### unwrap

```solidity
function unwrap(uint256 _amount, bool _receiveNative) external
```

Withdraw kreskoAsset to receive underlying tokens / native (-fee).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | The amount (uint256). |
| _receiveNative | bool | bool whether to receive underlying as native |

### setAnchorToken

```solidity
function setAnchorToken(address _anchor) external
```

Sets anchor token address

_Has modifiers: onlyRole._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _anchor | address | The anchor address. |

### enableNativeUnderlying

```solidity
function enableNativeUnderlying(bool _enabled) external
```

Enables depositing native token ETH in case of krETH

_Has modifiers: onlyRole._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _enabled | bool | The enabled (bool). |

### setFeeRecipient

```solidity
function setFeeRecipient(address _feeRecipient) external
```

Sets fee recipient address

_Has modifiers: onlyRole._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeRecipient | address | The fee recipient address. |

### setOpenFee

```solidity
function setOpenFee(uint48 _openFee) external
```

Sets deposit fee

_Has modifiers: onlyRole._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _openFee | uint48 | The open fee (uint48). |

### setCloseFee

```solidity
function setCloseFee(uint40 _closeFee) external
```

Sets withdraw fee

_Has modifiers: onlyRole._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _closeFee | uint40 | The open fee (uint48). |

### setUnderlying

```solidity
function setUnderlying(address _underlying) external
```

Sets underlying token address (and its decimals)
Zero address will disable functionality provided for the underlying.

_Has modifiers: onlyRole._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _underlying | address | The underlying address. |

