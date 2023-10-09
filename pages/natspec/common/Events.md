# Solidity API

## DiamondEvent

Diamond Event definitions

### DiamondCut

```solidity
event DiamondCut(struct FacetCut[] _diamondCut, address _init, bytes _calldata)
```

### Initialized

```solidity
event Initialized(address operator, uint96 version)
```

_Triggered when the contract has been initialized or reinitialized._

## StakingEvent

Staking Event definitions

### LiquidityAndStakeAdded

```solidity
event LiquidityAndStakeAdded(address to, uint256 amount, uint256 pid)
```

### LiquidityAndStakeRemoved

```solidity
event LiquidityAndStakeRemoved(address to, uint256 amount, uint256 pid)
```

### Deposit

```solidity
event Deposit(address user, uint256 pid, uint256 amount)
```

### Withdraw

```solidity
event Withdraw(address user, uint256 pid, uint256 amount)
```

### EmergencyWithdraw

```solidity
event EmergencyWithdraw(address user, uint256 pid, uint256 amount)
```

### ClaimRewards

```solidity
event ClaimRewards(address user, address rewardToken, uint256 amount)
```

### ClaimRewardsMulti

```solidity
event ClaimRewardsMulti(address to)
```

## AuthEvent

Authorization Event definitions

### OwnershipTransferred

```solidity
event OwnershipTransferred(address previousOwner, address newOwner)
```

### PendingOwnershipTransfer

```solidity
event PendingOwnershipTransfer(address previousOwner, address newOwner)
```

### RoleAdminChanged

```solidity
event RoleAdminChanged(bytes32 role, bytes32 previousAdminRole, bytes32 newAdminRole)
```

_Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`

`ADMIN_ROLE` is the starting admin for all roles, despite
{RoleAdminChanged} not being emitted signaling this.

_Available since v3.1.__

### RoleGranted

```solidity
event RoleGranted(bytes32 role, address account, address sender)
```

_Emitted when `account` is granted `role`.

`sender` is the account that originated the contract call, an admin role
bearer except when using {AccessControl-_setupRole}._

### RoleRevoked

```solidity
event RoleRevoked(bytes32 role, address account, address sender)
```

_Emitted when `account` is revoked `role`.

`sender` is the account that originated the contract call:
  - if using `revokeRole`, it is the admin role bearer
  - if using `renounceRole`, it is the role bearer (i.e. `account`)_

