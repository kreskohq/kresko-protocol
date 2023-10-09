// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import {Strings} from "libs/Strings.sol";
import {EnumerableSet} from "libs/EnumerableSet.sol";
import {Meta} from "libs/Meta.sol";

import {AuthEvent} from "common/Events.sol";
import {CError} from "common/CError.sol";
import {Role} from "common/Constants.sol";
import {cs} from "common/State.sol";

interface IGnosisSafeL2 {
    function isOwner(address owner) external view returns (bool);

    function getOwners() external view returns (address[] memory);
}

/**
 * @title Shared library for access control
 * @author Kresko
 */

library Auth {
    using EnumerableSet for EnumerableSet.AddressSet;

    function hasRole(bytes32 role, address account) internal view returns (bool) {
        return cs()._roles[role].members[account];
    }

    function getRoleMemberCount(bytes32 role) internal view returns (uint256) {
        return cs()._roleMembers[role].length();
    }

    /**
     * @dev Revert with a standard message if `Meta.msgSender` is missing `role`.
     * Overriding this function changes the behavior of the {onlyRole} modifier.
     *
     * Format of the revert message is described in {_checkRole}.
     *
     * _Available since v4.6._
     */
    function checkRole(bytes32 role) internal view {
        _checkRole(role, Meta.msgSender());
    }

    /**
     * @dev Revert with a standard message if `account` is missing `role`.
     *
     * The format of the revert reason is given by the following regular expression:
     *
     *  /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/
     */
    function _checkRole(bytes32 role, address account) internal view {
        if (!hasRole(role, account)) {
            revert(
                string(
                    abi.encodePacked(
                        "AccessControl: account ",
                        Strings.toHexString(uint160(account), 20),
                        " is missing role ",
                        Strings.toHexString(uint256(role), 32)
                    )
                )
            );
        }
    }

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) internal view returns (bytes32) {
        return cs()._roles[role].adminRole;
    }

    function getRoleMember(bytes32 role, uint256 index) internal view returns (address) {
        return cs()._roleMembers[role].at(index);
    }

    /**
     * @notice setups the security council
     *
     */
    function setupSecurityCouncil(address _councilAddress) internal {
        if (getRoleMemberCount(Role.SAFETY_COUNCIL) != 0) revert CError.SAFETY_COUNCIL_ALREADY_EXISTS();
        if (!IGnosisSafeL2(_councilAddress).isOwner(msg.sender)) revert CError.SAFETY_COUNCIL_INVALID_ADDRESS(_councilAddress);

        cs()._roles[Role.SAFETY_COUNCIL].members[_councilAddress] = true;
        cs()._roleMembers[Role.SAFETY_COUNCIL].add(_councilAddress);

        emit AuthEvent.RoleGranted(Role.SAFETY_COUNCIL, _councilAddress, Meta.msgSender());
    }

    function transferSecurityCouncil(address _newCouncil) internal {
        checkRole(Role.SAFETY_COUNCIL);
        uint256 owners = IGnosisSafeL2(_newCouncil).getOwners().length;
        if (owners < 5) revert CError.MULTISIG_NOT_ENOUGH_OWNERS(owners, 5);

        // As this is called by the multisig - just check that it's not an EOA
        cs()._roles[Role.SAFETY_COUNCIL].members[msg.sender] = false;
        cs()._roleMembers[Role.SAFETY_COUNCIL].remove(msg.sender);

        cs()._roles[Role.SAFETY_COUNCIL].members[_newCouncil] = true;
        cs()._roleMembers[Role.SAFETY_COUNCIL].add(_newCouncil);
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function grantRole(bytes32 role, address account) internal {
        checkRole(getRoleAdmin(role));
        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function revokeRole(bytes32 role, address account) internal {
        checkRole(getRoleAdmin(role));
        _revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been revoked `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `account`.
     */
    function _renounceRole(bytes32 role, address account) internal {
        if (account != Meta.msgSender()) revert CError.ACCESS_CONTROL_NOT_SELF(account, Meta.msgSender());

        _revokeRole(role, account);
    }

    /**
     * @dev Sets `adminRole` as ``role``'s admin role.
     *
     * Emits a {RoleAdminChanged} event.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal {
        bytes32 previousAdminRole = getRoleAdmin(role);
        cs()._roles[role].adminRole = adminRole;
        emit AuthEvent.RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * @notice Cannot grant the role `SAFETY_COUNCIL` - must be done via explicit function.
     *
     * Internal function without access restriction.
     */
    function _grantRole(bytes32 role, address account) internal ensureNotSafetyCouncil(role) {
        if (!hasRole(role, account)) {
            cs()._roles[role].members[account] = true;
            cs()._roleMembers[role].add(account);
            emit AuthEvent.RoleGranted(role, account, Meta.msgSender());
        }
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * Internal function without access restriction.
     */
    function _revokeRole(bytes32 role, address account) internal {
        if (hasRole(role, account)) {
            cs()._roles[role].members[account] = false;
            cs()._roleMembers[role].remove(account);
            emit AuthEvent.RoleRevoked(role, account, Meta.msgSender());
        }
    }

    /**
     * @dev Ensure we use the explicit `grantSafetyCouncilRole` function.
     */
    modifier ensureNotSafetyCouncil(bytes32 role) {
        if (role == Role.SAFETY_COUNCIL) revert CError.SAFETY_COUNCIL_NOT_ALLOWED();
        _;
    }
}
