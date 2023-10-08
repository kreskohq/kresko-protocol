# Solidity API

## DiamondOwnershipFacet

### transferOwnership

```solidity
function transferOwnership(address _newOwner) external
```

Initiate ownership transfer to a new address
caller must be the current contract owner
the new owner cannot be address(0)
emits a {AuthEvent.PendingOwnershipTransfer} event

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newOwner | address | address that is set as the pending new owner |

### acceptOwnership

```solidity
function acceptOwnership() external
```

Transfer the ownership to the new pending owner
caller must be the pending owner
emits a {AuthEvent.OwnershipTransferred} event

### owner

```solidity
function owner() external view returns (address owner_)
```

Get the address of the owner

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner_ | address | The address of the owner. |

### pendingOwner

```solidity
function pendingOwner() external view returns (address pendingOwner_)
```

Get the address of pending owner

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| pendingOwner_ | address | The address of the pending owner. |

### initialized

```solidity
function initialized() external view returns (bool initialized_)
```

Check if the contract is initialized

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialized_ | bool | bool True if the contract is initialized, false otherwise. |

