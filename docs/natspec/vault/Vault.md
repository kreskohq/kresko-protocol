# Solidity API

## Vault

This is derived from ERC4626 standard.
Users deposit tokens into the vault and receive shares of equal value in return.
Shares are redeemable for the underlying tokens at any time.
Price or exchange rate of SHARE/USD is determined by the total value of the underlying tokens in the vault and the share supply.

### HUNDRED

```solidity
uint256 HUNDRED
```

### governance

```solidity
address governance
```

Returns the governance address.

### feeRecipient

```solidity
address feeRecipient
```

Fee recipient address

### oracleDecimals

```solidity
uint8 oracleDecimals
```

Returns the oracle decimals used for value calculations.

### _assets

```solidity
mapping(address => struct VaultAsset) _assets
```

### assetList

```solidity
address[] assetList
```

Assets array used for iterating through the assets in the shares contract

### constructor

```solidity
constructor(string _name, string _symbol, uint8 _decimals, uint8 _oracleDecimals, address _feeRecipient) public
```

### onlyGovernance

```solidity
modifier onlyGovernance()
```

### check

```solidity
modifier check(address asset)
```

### deposit

```solidity
function deposit(address asset, uint256 assetsIn, address receiver) public virtual returns (uint256 sharesOut, uint256 assetFee)
```

This function deposits `assetsIn` of `asset`, regardless of the amount of vault shares minted.
If depositFee > 0, `depositFee` of `assetsIn` is sent to the fee recipient.

_emits Deposit(caller, receiver, asset, assetsIn, sharesOut);_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset to deposit. |
| assetsIn | uint256 | Amount of `asset` to deposit. |
| receiver | address | Address to receive `sharesOut` of vault shares. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| sharesOut | uint256 | Amount of vault shares minted for `assetsIn`. |
| assetFee | uint256 | Amount of fees paid in `asset`. |

### mint

```solidity
function mint(address asset, uint256 sharesOut, address receiver) public virtual returns (uint256 assetsIn, uint256 assetFee)
```

This function mints `sharesOut` of vault shares, regardless of the amount of `asset` received.
If depositFee > 0, `depositFee` of `assetsIn` is sent to the fee recipient.

_emits Deposit(caller, receiver, asset, assetsIn, sharesOut);_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset to deposit. |
| sharesOut | uint256 | Amount of vault shares desired to mint. |
| receiver | address | Address to receive `sharesOut` of shares. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assetsIn | uint256 | Assets used to mint `sharesOut` of vault shares. |
| assetFee | uint256 | Amount of fees paid in `asset`. |

### redeem

```solidity
function redeem(address asset, uint256 sharesIn, address receiver, address owner) public virtual returns (uint256 assetsOut, uint256 assetFee)
```

This function burns `sharesIn` of shares from `owner`, regardless of the amount of `asset` received.
If withdrawFee > 0, `withdrawFee` of `assetsOut` is sent to the fee recipient.

_emits Withdraw(caller, receiver, asset, owner, assetsOut, sharesIn);_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset to redeem. |
| sharesIn | uint256 | Amount of vault shares to redeem. |
| receiver | address | Address to receive the redeemed assets. |
| owner | address | Owner of vault shares. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assetsOut | uint256 | Amount of `asset` used for redeem `assetsOut`. |
| assetFee | uint256 | Amount of fees paid in `asset`. |

### withdraw

```solidity
function withdraw(address asset, uint256 assetsOut, address receiver, address owner) public virtual returns (uint256 sharesIn, uint256 assetFee)
```

This function withdraws `assetsOut` of assets, regardless of the amount of vault shares required.
If withdrawFee > 0, `withdrawFee` of `assetsOut` is sent to the fee recipient.

_emits Withdraw(caller, receiver, asset, owner, assetsOut, sharesIn);_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset to withdraw. |
| assetsOut | uint256 | Amount of `asset` desired to withdraw. |
| receiver | address | Address to receive the withdrawn assets. |
| owner | address | Owner of vault shares. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| sharesIn | uint256 | Amount of vault shares used to withdraw `assetsOut` of `asset`. |
| assetFee | uint256 | Amount of fees paid in `asset`. |

### assets

```solidity
function assets(address asset) public view returns (struct VaultAsset)
```

Returns the asset struct for a given asset

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Supported asset address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct VaultAsset |  |

### totalAssets

```solidity
function totalAssets() public view virtual returns (uint256 result)
```

Returns the total value of all assets in the shares contract in USD WAD precision.

### exchangeRate

```solidity
function exchangeRate() public view virtual returns (uint256)
```

Returns share/USD exchanage rate

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 |  |

### previewDeposit

```solidity
function previewDeposit(address asset, uint256 assetsIn) public view virtual returns (uint256 sharesOut, uint256 assetFee)
```

This function is used for previewing the amount of shares minted for `assetsIn` of `asset`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Supported asset address |
| assetsIn | uint256 | Amount of `asset` in. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| sharesOut | uint256 | Amount of vault shares minted. |
| assetFee | uint256 | Amount of fees paid in `asset`. |

### previewMint

```solidity
function previewMint(address asset, uint256 sharesOut) public view virtual returns (uint256 assetsIn, uint256 assetFee)
```

This function is used for previewing `assetsIn` of `asset` required to mint `sharesOut` of vault shares.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Supported asset address |
| sharesOut | uint256 | Desired amount of vault shares to mint. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assetsIn | uint256 | Amount of `asset` required. |
| assetFee | uint256 | Amount of fees paid in `asset`. |

### previewRedeem

```solidity
function previewRedeem(address asset, uint256 sharesIn) public view virtual returns (uint256 assetsOut, uint256 assetFee)
```

This function is used for previewing `assetsOut` of `asset` received for `sharesIn` of vault shares.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Supported asset address |
| sharesIn | uint256 | Desired amount of vault shares to burn. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assetsOut | uint256 | Amount of `asset` received. |
| assetFee | uint256 | Amount of fees paid in `asset`. |

### previewWithdraw

```solidity
function previewWithdraw(address asset, uint256 assetsOut) public view virtual returns (uint256 sharesIn, uint256 assetFee)
```

This function is used for previewing `sharesIn` of vault shares required to burn for `assetsOut` of `asset`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Supported asset address |
| assetsOut | uint256 | Desired amount of `asset` out. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| sharesIn | uint256 | Amount of vault shares required. |
| assetFee | uint256 | Amount of fees paid in `asset`. |

### maxRedeem

```solidity
function maxRedeem(address asset, address owner) public view virtual returns (uint256 max)
```

Returns the maximum redeemable amount for `user`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Supported asset address. |
| owner | address | Owner of vault shares. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| max | uint256 |  |

### maxWithdraw

```solidity
function maxWithdraw(address asset, address owner) public view returns (uint256 max)
```

Returns the maximum redeemable amount for `user`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Supported asset address. |
| owner | address | Owner of vault shares. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| max | uint256 |  |

### maxDeposit

```solidity
function maxDeposit(address asset) public view virtual returns (uint256)
```

Returns the maximum deposit amount of `asset`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Supported asset address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 |  |

### maxMint

```solidity
function maxMint(address asset, address user) public view virtual returns (uint256 max)
```

Returns the maximum mint using `asset`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Supported asset address. |
| user | address |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| max | uint256 |  |

### addAsset

```solidity
function addAsset(struct VaultAsset config) external
```

Adds a new asset to the vault

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| config | struct VaultAsset |  |

### removeAsset

```solidity
function removeAsset(address asset) external
```

Removes an asset from the vault

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset address to remove emits assetRemoved(asset, block.timestamp); |

### setOracle

```solidity
function setOracle(address asset, address oracle) external
```

Sets a new oracle for a asset

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset to set the oracle for |
| oracle | address | Oracle to set |

### setOracleDecimals

```solidity
function setOracleDecimals(uint8 _oracleDecimals) external
```

Sets a new oracle decimals

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _oracleDecimals | uint8 | New oracle decimal precision |

### setAssetEnabled

```solidity
function setAssetEnabled(address asset, bool isEnabled) external
```

Sets the enabled status for a asset

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset to set the enabled status for |
| isEnabled | bool | Enabled status to set |

### setDepositFee

```solidity
function setDepositFee(address asset, uint256 fee) external
```

Sets the deposit fee for a asset

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset to set the deposit fee for |
| fee | uint256 | Fee to set |

### setWithdrawFee

```solidity
function setWithdrawFee(address asset, uint256 fee) external
```

Sets the withdraw fee for a asset

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset to set the withdraw fee for |
| fee | uint256 | Fee to set |

### setMaxDeposits

```solidity
function setMaxDeposits(address asset, uint256 maxDeposits) external
```

Sets the max deposit amount for a asset

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset to set the max deposits for |
| maxDeposits | uint256 | Max deposits to set |

### setGovernance

```solidity
function setGovernance(address _newGovernance) external
```

Current governance sets a new governance address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newGovernance | address | The new governance address |

### setFeeRecipient

```solidity
function setFeeRecipient(address _newFeeRecipient) external
```

Current governance sets a new fee recipient address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newFeeRecipient | address | The new fee recipient address |

### _handleMintFee

```solidity
function _handleMintFee(struct VaultAsset assetInfo, uint256 assetsIn) internal view virtual returns (uint256 assetsInAfterFee, uint256 assetFee)
```

### _handleRedeemFee

```solidity
function _handleRedeemFee(struct VaultAsset assetInfo, uint256 assetsIn) internal view virtual returns (uint256 assetsInAfterFee, uint256 assetFee)
```

### _handleDepositFee

```solidity
function _handleDepositFee(struct VaultAsset assetInfo, uint256 assetsIn) internal view virtual returns (uint256 assetsInAfterFee, uint256 assetFee)
```

### _handleWithdrawFee

```solidity
function _handleWithdrawFee(struct VaultAsset assetInfo, uint256 assetsIn) internal view virtual returns (uint256 assetsInAfterFee, uint256 assetFee)
```

