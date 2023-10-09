# Solidity API

## KreskoAssetAnchor

Main purpose of this token is to represent a static amount of the possibly rebased underlying KreskoAsset.
Main use-cases are normalized book-keeping, bridging and integration with external contracts.

Shares means amount of this token.
Assets mean amount of KreskoAssets.

### constructor

```solidity
constructor(contract IKreskoAsset _asset) public payable
```

### initialize

```solidity
function initialize(contract IKreskoAsset _asset, string _name, string _symbol, address _admin) external
```

Initializes the Kresko Asset Anchor.

_Decimals are not supplied as they are read from the underlying Kresko Asset_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _asset | contract IKreskoAsset | The underlying (Kresko) Asset |
| _name | string | Name of the anchor token |
| _symbol | string | Symbol of the anchor token |
| _admin | address | The adminstrator of this contract. |

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

### totalAssets

```solidity
function totalAssets() public view virtual returns (uint256)
```

Track the underlying amount

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Total supply for the underlying |

### convertToAssets

```solidity
function convertToAssets(uint256 shares) public view virtual returns (uint256 assets)
```

Returns the total amount of krAssets out

### convertToShares

```solidity
function convertToShares(uint256 assets) public view virtual returns (uint256 shares)
```

Returns the total amount of anchor tokens out

### issue

```solidity
function issue(uint256 _assets, address _to) public virtual returns (uint256 shares)
```

Mints @param _assets of krAssets for @param _to,
Mints relative @return _shares of wkrAssets

### destroy

```solidity
function destroy(uint256 _assets, address _from) public virtual returns (uint256 shares)
```

Burns @param _assets of krAssets from @param _from,
Burns relative @return _shares of wkrAssets

### wrap

```solidity
function wrap(uint256 assets) external
```

Mint Kresko Anchor Asset to Kresko Asset (Only KreskoAsset can call)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | The assets (uint256). |

### unwrap

```solidity
function unwrap(uint256 assets) external
```

Burn Kresko Anchor Asset to Kresko Asset (Only KreskoAsset can call)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | The assets (uint256). |

### deposit

```solidity
function deposit(uint256, address) public pure returns (uint256)
```

reverting function, kept to maintain compatibility with ERC4626 standard

### withdraw

```solidity
function withdraw(uint256, address, address) public pure returns (uint256)
```

reverting function, kept to maintain compatibility with ERC4626 standard

### redeem

```solidity
function redeem(uint256, address, address) public pure returns (uint256)
```

reverting function, kept to maintain compatibility with ERC4626 standard

### _beforeWithdraw

```solidity
function _beforeWithdraw(uint256 assets, uint256 shares) internal virtual
```

### _afterDeposit

```solidity
function _afterDeposit(uint256 assets, uint256 shares) internal virtual
```

