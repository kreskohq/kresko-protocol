# Solidity API

## Rebaser

### unrebase

```solidity
function unrebase(uint256 self, struct IKreskoAsset.Rebase _rebase) internal pure returns (uint256)
```

Unrebase a value by a given rebase struct.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | uint256 | The value to unrebase. |
| _rebase | struct IKreskoAsset.Rebase | The rebase struct. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The unrebased value. |

### rebase

```solidity
function rebase(uint256 self, struct IKreskoAsset.Rebase _rebase) internal pure returns (uint256)
```

Rebase a value by a given rebase struct.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | uint256 | The value to rebase. |
| _rebase | struct IKreskoAsset.Rebase | The rebase struct. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The rebased value. |

