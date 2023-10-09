# Solidity API

## KreskoAsset

Rebases to adjust for stock splits and reverse stock splits
Minting, burning and rebasing can only be performed by the `Role.OPERATOR`

### kresko

```solidity
address kresko
```

### isRebased

```solidity
bool isRebased
```

### anchor

```solidity
address anchor
```

### underlying

```solidity
address underlying
```

### underlyingDecimals

```solidity
uint8 underlyingDecimals
```

### openFee

```solidity
uint48 openFee
```

### closeFee

```solidity
uint40 closeFee
```

### nativeUnderlyingEnabled

```solidity
bool nativeUnderlyingEnabled
```

### feeRecipient

```solidity
address payable feeRecipient
```

### initialize

```solidity
function initialize(string _name, string _symbol, uint8 _decimals, address _admin, address _kresko, address _underlying, address _feeRecipient, uint48 _openFee, uint40 _closeFee) external
```

Initialize, an external state-modifying function.

_Has modifiers: initializer._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _name | string | The name (string). |
| _symbol | string | The symbol (string). |
| _decimals | uint8 | The decimals (uint8). |
| _admin | address | The admin address. |
| _kresko | address | The kresko address. |
| _underlying | address | The underlying address. |
| _feeRecipient | address | The fee recipient address. |
| _openFee | uint48 | The open fee (uint48). |
| _closeFee | uint40 | The close fee (uint40). |

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

### setUnderlying

```solidity
function setUnderlying(address _underlyingAddr) public
```

Sets underlying token address (and its decimals)
Zero address will disable functionality provided for the underlying.

_Has modifiers: onlyRole._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _underlyingAddr | address |  |

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
function setFeeRecipient(address _feeRecipient) public
```

Sets fee recipient address

_Has modifiers: onlyRole._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeRecipient | address | The fee recipient address. |

### setOpenFee

```solidity
function setOpenFee(uint48 _openFee) public
```

Sets deposit fee

_Has modifiers: onlyRole._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _openFee | uint48 | The open fee (uint48). |

### setCloseFee

```solidity
function setCloseFee(uint40 _closeFee) public
```

Sets withdraw fee

_Has modifiers: onlyRole._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _closeFee | uint40 | The open fee (uint48). |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
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

### rebaseInfo

```solidity
function rebaseInfo() external view returns (struct IKreskoAsset.Rebase)
```

### totalSupply

```solidity
function totalSupply() public view returns (uint256)
```

Returns the total supply of the token.
This amount is adjusted by rebases.

### balanceOf

```solidity
function balanceOf(address _account) public view returns (uint256)
```

Returns the balance of @param _account
This amount is adjusted by rebases.

### allowance

```solidity
function allowance(address _owner, address _account) public view returns (uint256)
```

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

### approve

```solidity
function approve(address spender, uint256 amount) public returns (bool)
```

### transfer

```solidity
function transfer(address _to, uint256 _amount) public returns (bool)
```

### transferFrom

```solidity
function transferFrom(address _from, address _to, uint256 _amount) public returns (bool)
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

### receive

```solidity
receive() external payable
```

### _mint

```solidity
function _mint(address _to, uint256 _amount) internal
```

### _burn

```solidity
function _burn(address _from, uint256 _amount) internal
```

### _adjustDecimals

```solidity
function _adjustDecimals(uint256 _amount, uint8 _fromDecimal, uint8 _toDecimal) internal pure returns (uint256)
```

### _transfer

```solidity
function _transfer(address _from, address _to, uint256 _amount) internal returns (bool)
```

_Internal balances are always unrebased, events emitted are not._

