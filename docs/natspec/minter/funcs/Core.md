# Solidity API

## MCore

### mint

```solidity
function mint(struct MinterState self, address _kreskoAsset, address _anchor, uint256 _amount, address _account) internal
```

### burn

```solidity
function burn(struct MinterState self, address _kreskoAsset, address _anchor, uint256 _burnAmount, address _account) internal
```

Repay user kresko asset debt.

_Updates the principal in MinterState_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _kreskoAsset | address | the asset being repaid |
| _anchor | address | the anchor token of the asset being repaid |
| _burnAmount | uint256 | the asset amount being burned |
| _account | address | the account the debt is subtracted from |

### handleDeposit

```solidity
function handleDeposit(struct MinterState self, address _account, address _collateralAsset, uint256 _depositAmount) internal
```

Records account as having deposited an amount of a collateral asset.

_Token transfers are expected to be done by the caller._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | The address of the collateral asset. |
| _collateralAsset | address | The address of the collateral asset. |
| _depositAmount | uint256 | The amount of the collateral asset deposited. |

### handleWithdrawal

```solidity
function handleWithdrawal(struct MinterState self, address _account, address _collateralAsset, struct Asset _asset, uint256 _withdrawAmount, uint256 _collateralDeposits, uint256 _collateralIndex) internal
```

Verifies that the account has sufficient collateral for the requested amount and records the collateral

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | The address of the account to verify the collateral for. |
| _collateralAsset | address | The address of the collateral asset. |
| _asset | struct Asset |  |
| _withdrawAmount | uint256 | The amount of the collateral asset to withdraw. |
| _collateralDeposits | uint256 | Collateral deposits for the account. |
| _collateralIndex | uint256 | Index of the collateral asset in the account's deposited collateral assets array. |

### handleUncheckedWithdrawal

```solidity
function handleUncheckedWithdrawal(struct MinterState self, address _account, address _collateralAsset, struct Asset _asset, uint256 _withdrawAmount, uint256 _collateralDeposits, uint256 _collateralIndex) internal
```

records the collateral withdrawal

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | The address of the account to verify the collateral for. |
| _collateralAsset | address | The address of the collateral asset. |
| _asset | struct Asset | The collateral asset struct. |
| _withdrawAmount | uint256 | The amount of the collateral asset to withdraw. |
| _collateralDeposits | uint256 | Collateral deposits for the account. |
| _collateralIndex | uint256 | Index of the collateral asset in the account's deposited collateral assets array. |

### checkCollateralParams

```solidity
function checkCollateralParams(struct MinterState self, address _account, address _collateralAsset, uint256 _collateralIndex, uint256 _amount) internal view
```

### checkAccountCollateral

```solidity
function checkAccountCollateral(struct MinterState self, address _account) internal view
```

verifies that the account has enough collateral value

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct MinterState |  |
| _account | address | The address of the account to verify the collateral for. |

### maybePushToMintedAssets

```solidity
function maybePushToMintedAssets(struct MinterState self, address _account, address _kreskoAsset) internal
```

