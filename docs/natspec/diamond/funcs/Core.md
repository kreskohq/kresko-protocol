# Solidity API

## DCore

### initialize

```solidity
function initialize(struct DiamondState self, address _owner) internal
```

Ownership initializer
Only called on the first deployment

### initiateOwnershipTransfer

```solidity
function initiateOwnershipTransfer(struct DiamondState self, address _newOwner) internal
```

caller must be the current contract owner

_Initiate ownership transfer to a new address_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct DiamondState |  |
| _newOwner | address | address that is set as the pending new owner |

### finalizeOwnershipTransfer

```solidity
function finalizeOwnershipTransfer(struct DiamondState self) internal
```

caller must be the pending owner

_Transfer the ownership to the new pending owner_

