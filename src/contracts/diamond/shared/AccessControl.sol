// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "../libraries/Strings.sol";
import {AccessControlEvent} from "../shared/Events.sol";
import {ds, Meta, EnumerableSet} from "../storage/DiamondStorage.sol";

bytes32 constant DEFAULT_ADMIN_ROLE = 0x00;
bytes32 constant MINTER_OPERATOR_ROLE = keccak256("kresko.minter.operator");

/**
 * @title Shared library for access control
 * @author Kresko
 */
library AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;

    function hasRole(bytes32 role, address account) internal view returns (bool) {
        return ds()._roles[role].members[account];
    }

    function getRoleMemberCount(bytes32 role) internal view returns (uint256) {
        return ds()._roleMembers[role].length();
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
        return ds()._roles[role].adminRole;
    }

    function getRoleMember(bytes32 role, uint256 index) internal view returns (address) {
        return ds()._roleMembers[role].at(index);
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
        ds()._roleMembers[role].remove(account);
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
        require(account == Meta.msgSender(), "AccessControl: can only renounce roles for self");

        _revokeRole(role, account);
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event. Note that unlike {grantRole}, this function doesn't perform any
     * checks on the calling account.
     *
     * [WARNING]
     * ====
     * This function should only be called from the constructor when setting
     * up the initial roles for the system.
     *
     * Using this function in any other way is effectively circumventing the admin
     * system imposed by {AccessControl}.
     * ====
     *
     * NOTE: This function is deprecated in favor of {_grantRole}.
     */
    function _setupRole(bytes32 role, address account) internal {
        _grantRole(role, account);
    }

    /**
     * @dev Sets `adminRole` as ``role``'s admin role.
     *
     * Emits a {RoleAdminChanged} event.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal {
        bytes32 previousAdminRole = getRoleAdmin(role);
        ds()._roles[role].adminRole = adminRole;
        emit AccessControlEvent.RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * Internal function without access restriction.
     */
    function _grantRole(bytes32 role, address account) internal {
        if (!hasRole(role, account)) {
            ds()._roles[role].members[account] = true;
            ds()._roleMembers[role].add(account);
            emit AccessControlEvent.RoleGranted(role, account, Meta.msgSender());
        }
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * Internal function without access restriction.
     */
    function _revokeRole(bytes32 role, address account) internal {
        if (hasRole(role, account)) {
            ds()._roles[role].members[account] = false;
            ds()._roleMembers[role].remove(account);
            emit AccessControlEvent.RoleRevoked(role, account, Meta.msgSender());
        }
    }
}
