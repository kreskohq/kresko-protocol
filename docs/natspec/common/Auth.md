# Solidity API

## IGnosisSafeL2

### isOwner

```solidity
function isOwner(address owner) external view returns (bool)
```

### getOwners

```solidity
function getOwners() external view returns (address[])
```

## Auth

### hasRole

```solidity
function hasRole(bytes32 role, address account) internal view returns (bool)
```

### getRoleMemberCount

```solidity
function getRoleMemberCount(bytes32 role) internal view returns (uint256)
```

### checkRole

```solidity
function checkRole(bytes32 role) internal view
```

_Revert with a standard message if `Meta.msgSender` is missing `role`.
Overriding this function changes the behavior of the {onlyRole} modifier.

Format of the revert message is described in {_checkRole}.

_Available since v4.6.__

### _checkRole

```solidity
function _checkRole(bytes32 role, address account) internal view
```

_Revert with a standard message if `account` is missing `role`.

The format of the revert reason is given by the following regular expression:

 /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/_

### getRoleAdmin

```solidity
function getRoleAdmin(bytes32 role) internal view returns (bytes32)
```

_Returns the admin role that controls `role`. See {grantRole} and
{revokeRole}.

To change a role's admin, use {_setRoleAdmin}._

### getRoleMember

```solidity
function getRoleMember(bytes32 role, uint256 index) internal view returns (address)
```

### setupSecurityCouncil

```solidity
function setupSecurityCouncil(address _councilAddress) internal
```

setups the security council

### transferSecurityCouncil

```solidity
function transferSecurityCouncil(address _newCouncil) internal
```

### grantRole

```solidity
function grantRole(bytes32 role, address account) internal
```

_Grants `role` to `account`.

If `account` had not been already granted `role`, emits a {RoleGranted}
event.

Requirements:

- the caller must have ``role``'s admin role._

### revokeRole

```solidity
function revokeRole(bytes32 role, address account) internal
```

_Revokes `role` from `account`.

If `account` had been granted `role`, emits a {RoleRevoked} event.

Requirements:

- the caller must have ``role``'s admin role._

### _renounceRole

```solidity
function _renounceRole(bytes32 role, address account) internal
```

_Revokes `role` from the calling account.

Roles are often managed via {grantRole} and {revokeRole}: this function's
purpose is to provide a mechanism for accounts to lose their privileges
if they are compromised (such as when a trusted device is misplaced).

If the calling account had been revoked `role`, emits a {RoleRevoked}
event.

Requirements:

- the caller must be `account`._

### _setRoleAdmin

```solidity
function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal
```

_Sets `adminRole` as ``role``'s admin role.

Emits a {RoleAdminChanged} event._

### _grantRole

```solidity
function _grantRole(bytes32 role, address account) internal
```

Cannot grant the role `SAFETY_COUNCIL` - must be done via explicit function.

Internal function without access restriction.

_Grants `role` to `account`._

### _revokeRole

```solidity
function _revokeRole(bytes32 role, address account) internal
```

_Revokes `role` from `account`.

Internal function without access restriction._

### ensureNotSafetyCouncil

```solidity
modifier ensureNotSafetyCouncil(bytes32 role)
```

_Ensure we use the explicit `grantSafetyCouncilRole` function._

