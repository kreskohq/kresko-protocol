# Solidity API

## IERC4626Upgradeable

### asset

```solidity
function asset() external view returns (contract IKreskoAsset)
```

The underlying Kresko Asset

### deposit

```solidity
function deposit(uint256 assets, address receiver) external returns (uint256 shares)
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
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)
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

### maxDeposit

```solidity
function maxDeposit(address) external view returns (uint256)
```

### maxMint

```solidity
function maxMint(address) external view returns (uint256 assets)
```

### maxRedeem

```solidity
function maxRedeem(address owner) external view returns (uint256 assets)
```

### maxWithdraw

```solidity
function maxWithdraw(address owner) external view returns (uint256 assets)
```

### mint

```solidity
function mint(uint256 shares, address receiver) external returns (uint256 assets)
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

### previewDeposit

```solidity
function previewDeposit(uint256 assets) external view returns (uint256 shares)
```

### previewMint

```solidity
function previewMint(uint256 shares) external view returns (uint256 assets)
```

### previewRedeem

```solidity
function previewRedeem(uint256 shares) external view returns (uint256 assets)
```

### previewWithdraw

```solidity
function previewWithdraw(uint256 assets) external view returns (uint256 shares)
```

### totalAssets

```solidity
function totalAssets() external view returns (uint256)
```

Track the underlying amount

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Total supply for the underlying |

### redeem

```solidity
function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)
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

