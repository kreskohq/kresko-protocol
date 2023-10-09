# Solidity API

## SafetyCouncilFacet

`Role.SAFETY_COUNCIL` must be a multisig.

### toggleAssetsPaused

```solidity
function toggleAssetsPaused(address[] _assets, enum Action _action, bool _withDuration, uint256 _duration) external
```

These functions are only callable by a multisig quorum.

_Toggle paused-state of assets in a per-action basis_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assets | address[] | list of addresses of krAssets and/or collateral assets |
| _action | enum Action | One of possible user actions:  Deposit = 0  Withdraw = 1,  Repay = 2,  Borrow = 3,  Liquidate = 4 |
| _withDuration | bool | Set a duration for this pause - @todo: implement it if required |
| _duration | uint256 | Duration for the pause if `_withDuration` is true |

### setSafetyStateSet

```solidity
function setSafetyStateSet(bool val) external
```

set the safetyStateSet flag

### safetyStateSet

```solidity
function safetyStateSet() external view returns (bool)
```

For external checks if a safety state has been set for any asset

### safetyStateFor

```solidity
function safetyStateFor(address _asset, enum Action _action) external view returns (struct SafetyState)
```

View the state of safety measures for an asset on a per-action basis

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _asset | address | krAsset / collateral asset |
| _action | enum Action | One of possible user actions:  Deposit = 0  Withdraw = 1,  Repay = 2,  Borrow = 3,  Liquidate = 4 |

### assetActionPaused

```solidity
function assetActionPaused(enum Action _action, address _asset) external view returns (bool)
```

Check if `_asset` has a pause enabled for `_action`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _action | enum Action | enum `Action`  Deposit = 0  Withdraw = 1,  Repay = 2,  Borrow = 3,  Liquidate = 4 |
| _asset | address |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true if `_action` is paused |

