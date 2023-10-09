# Solidity API

## ERC4626Upgradeable

Minimal ERC4626 tokenized Vault implementation.
Kresko:
Adds issue/destroy functions that are called when KreskoAssets are minted/burned through the protocol.

### Issue

```solidity
event Issue(address caller, address owner, uint256 assets, uint256 shares)
```

### Deposit

```solidity
event Deposit(address caller, address owner, uint256 assets, uint256 shares)
```

### Destroy

```solidity
event Destroy(address caller, address receiver, address owner, uint256 assets, uint256 shares)
```

### Withdraw

```solidity
event Withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares)
```

### asset

```solidity
contract IKreskoAsset asset
```

The underlying Kresko Asset

### constructor

```solidity
constructor(contract IKreskoAsset _asset) internal payable
```

### __ERC4626Upgradeable_init

```solidity
function __ERC4626Upgradeable_init(contract IERC20Permit _asset, string _name, string _symbol) internal
```

Initializes the ERC4626.

_decimals are read from the underlying asset_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _asset | contract IERC20Permit | The underlying (Kresko) Asset |
| _name | string | Name of the anchor token |
| _symbol | string | Symbol of the anchor token |

### issue

```solidity
function issue(uint256 assets, address to) public virtual returns (uint256 shares)
```

When new KreskoAssets are minted:
Issues the equivalent amount of anchor tokens to Kresko
Issues the equivalent amount of assets to user

### destroy

```solidity
function destroy(uint256 assets, address from) public virtual returns (uint256 shares)
```

When new KreskoAssets are burned:
Destroys the equivalent amount of anchor tokens from Kresko
Destorys the equivalent amount of assets from user

### totalAssets

```solidity
function totalAssets() public view virtual returns (uint256)
```

Track the underlying amount

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Total supply for the underlying |

### convertToShares

```solidity
function convertToShares(uint256 assets) public view virtual returns (uint256)
```

### convertToAssets

```solidity
function convertToAssets(uint256 shares) public view virtual returns (uint256)
```

### previewIssue

```solidity
function previewIssue(uint256 assets) public view virtual returns (uint256)
```

amount of shares for amount of @param assets

### previewDestroy

```solidity
function previewDestroy(uint256 shares) public view virtual returns (uint256)
```

amount of assets for amount of @param shares

### previewDeposit

```solidity
function previewDeposit(uint256 assets) public view virtual returns (uint256)
```

amount of shares for amount of @param assets

### previewMint

```solidity
function previewMint(uint256 shares) public view virtual returns (uint256)
```

amount of assets for amount of @param shares

### previewWithdraw

```solidity
function previewWithdraw(uint256 assets) public view virtual returns (uint256)
```

amount of shares for amount of @param assets

### previewRedeem

```solidity
function previewRedeem(uint256 shares) public view virtual returns (uint256)
```

amount of assets for amount of @param shares

### maxDeposit

```solidity
function maxDeposit(address) public view virtual returns (uint256)
```

### maxIssue

```solidity
function maxIssue(address) public view virtual returns (uint256)
```

### maxMint

```solidity
function maxMint(address) public view virtual returns (uint256)
```

### maxDestroy

```solidity
function maxDestroy(address owner) public view virtual returns (uint256)
```

### maxWithdraw

```solidity
function maxWithdraw(address owner) public view virtual returns (uint256)
```

### maxRedeem

```solidity
function maxRedeem(address owner) public view virtual returns (uint256)
```

### _beforeWithdraw

```solidity
function _beforeWithdraw(uint256 assets, uint256 shares) internal virtual
```

### _afterDeposit

```solidity
function _afterDeposit(uint256 assets, uint256 shares) internal virtual
```

### deposit

```solidity
function deposit(uint256 assets, address receiver) public virtual returns (uint256 shares)
```

Deposit KreskoAssets for equivalent amount of anchor tokens

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Amount of KreskoAssets to deposit |
| receiver | address | Address to send shares to |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Amount of shares minted |

### withdraw

```solidity
function withdraw(uint256 assets, address receiver, address owner) public virtual returns (uint256 shares)
```

Withdraw KreskoAssets for equivalent amount of anchor tokens

_shares are burned from owner, not msg.sender_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Amount of KreskoAssets to withdraw |
| receiver | address | Address to send KreskoAssets to |
| owner | address | Address to burn shares from |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Amount of shares burned |

### mint

```solidity
function mint(uint256 shares, address receiver) public virtual returns (uint256 assets)
```

Mint shares of anchor tokens for equivalent amount of KreskoAssets

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Amount of shares to mint |
| receiver | address | Address to send shares to |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Amount of KreskoAssets redeemed |

### redeem

```solidity
function redeem(uint256 shares, address receiver, address owner) public virtual returns (uint256 assets)
```

Redeem shares of anchor for KreskoAssets

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Amount of shares to redeem |
| receiver | address | Address to send KreskoAssets to |
| owner | address | Address to burn shares from |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Amount of KreskoAssets redeemed |

