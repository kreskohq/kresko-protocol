# Solidity API

## IAuthorizationFacet

### getRoleMember

```solidity
function getRoleMember(bytes32 role, uint256 index) external view returns (address)
```

WARNING:
When using {getRoleMember} and {getRoleMemberCount}, make sure
you perform all queries on the same block.

See the following forum post for more information:
- https://forum.openzeppelin.com/t/iterating-over-elements-on-enumerableset-in-openzeppelin-contracts/2296

_OpenZeppelin
Returns one of the accounts that have `role`. `index` must be a
value between 0 and {getRoleMemberCount}, non-inclusive.

Role bearers are not sorted in any particular way, and their ordering may
change at any point.

Kresko

TL;DR above:

- If you iterate the EnumSet outside a single block scope you might get different results.
- Since when EnumSet member is deleted it is replaced with the highest index._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | address with the `role` |

### getRoleMemberCount

```solidity
function getRoleMemberCount(bytes32 role) external view returns (uint256)
```

See warning in {getRoleMember} if combining these two

_Returns the number of accounts that have `role`. Can be used
together with {getRoleMember} to enumerate all bearers of a role._

### grantRole

```solidity
function grantRole(bytes32 role, address account) external
```

_Grants `role` to `account`.

If `account` had not been already granted `role`, emits a {RoleGranted}
event.

Requirements:

- the caller must have ``role``'s admin role._

### getRoleAdmin

```solidity
function getRoleAdmin(bytes32 role) external view returns (bytes32)
```

To change a role's admin, use {_setRoleAdmin}.

_Returns the admin role that controls `role`. See {grantRole} and
{revokeRole}._

### hasRole

```solidity
function hasRole(bytes32 role, address account) external view returns (bool)
```

_Returns true if `account` has been granted `role`._

### renounceRole

```solidity
function renounceRole(bytes32 role, address account) external
```

Requirements

- the caller must be `account`.

_Revokes `role` from the calling account.

Roles are often managed via {grantRole} and {revokeRole}: this function's
purpose is to provide a mechanism for accounts to lose their privileges
if they are compromised (such as when a trusted device is misplaced).

If the calling account had been revoked `role`, emits a {RoleRevoked}
event._

### revokeRole

```solidity
function revokeRole(bytes32 role, address account) external
```

Requirements

- the caller must have ``role``'s admin role.

_Revokes `role` from `account`._

