# Solidity API

## VEvent

### Deposit

```solidity
event Deposit(address caller, address receiver, address asset, uint256 assetsIn, uint256 sharesOut)
```

Emitted when a deposit/mint is made

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | Caller of the deposit/mint |
| receiver | address | Receiver of the minted assets |
| asset | address | Asset that was deposited/minted |
| assetsIn | uint256 | Amount of assets deposited |
| sharesOut | uint256 | Amount of shares minted |

### OracleSet

```solidity
event OracleSet(address asset, address oracle, uint256 price, uint256 timestamp)
```

Emitted when a new oracle is set for an asset

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset that was updated |
| oracle | address | Oracle that was set |
| price | uint256 |  |
| timestamp | uint256 | Timestamp of the update |

### AssetAdded

```solidity
event AssetAdded(address asset, address oracle, uint256 price, uint256 depositLimit, uint256 timestamp)
```

Emitted when a new asset is added to the shares contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset that was added |
| oracle | address | Oracle that was added |
| price | uint256 | Price of the asset |
| depositLimit | uint256 | Deposit limit of the asset |
| timestamp | uint256 | Timestamp of the addition |

### AssetRemoved

```solidity
event AssetRemoved(address asset, uint256 timestamp)
```

Emitted when a previously existing asset is removed from the shares contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset that was removed |
| timestamp | uint256 | Timestamp of the removal |

### AssetEnabledStatusChanged

```solidity
event AssetEnabledStatusChanged(address asset, bool enabled, uint256 timestamp)
```

Emitted when the enabled status for asset is changed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset that was removed |
| enabled | bool | Enabled status set |
| timestamp | uint256 | Timestamp of the removal |

### Withdraw

```solidity
event Withdraw(address caller, address receiver, address asset, address owner, uint256 assetsOut, uint256 sharesIn)
```

Emitted when a withdraw/redeem is made

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | Caller of the withdraw/redeem |
| receiver | address | Receiver of the withdrawn assets |
| asset | address | Asset that was withdrawn/redeemed |
| owner | address | Owner of the withdrawn assets |
| assetsOut | uint256 | Amount of assets withdrawn |
| sharesIn | uint256 | Amount of shares redeemed |

