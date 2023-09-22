// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {FacetCut} from "diamond/Types.sol";

/**
 * @author Kresko
 * @title Events
 * @notice Common Event definitions
 */

/**
 * @author Kresko
 * @title Events
 * @notice Diamond Event definitions
 */
library DiamondEvent {
    event DiamondCut(FacetCut[] _diamondCut, address _init, bytes _calldata);
    /**
     * @dev Triggered when the contract has been initialized or reinitialized.
     */
    event Initialized(address indexed operator, uint8 version);
}

/**
 * @author Kresko
 * @title Events
 * @notice Staking Event definitions
 */
library StakingEvent {
    event LiquidityAndStakeAdded(address indexed to, uint256 indexed amount, uint256 indexed pid);
    event LiquidityAndStakeRemoved(address indexed to, uint256 indexed amount, uint256 indexed pid);
    event Deposit(address indexed user, uint256 indexed pid, uint256 indexed amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 indexed amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 indexed amount);
    event ClaimRewards(address indexed user, address indexed rewardToken, uint256 indexed amount);
    event ClaimRewardsMulti(address indexed to);
}

/**
 * @author Kresko
 * @title Events
 * @notice Authorization Event definitions
 */
library AuthEvent {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PendingOwnershipTransfer(address indexed previousOwner, address indexed newOwner);
    /**
     * @dev Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`
     *
     * `ADMIN_ROLE` is the starting admin for all roles, despite
     * {RoleAdminChanged} not being emitted signaling this.
     *
     * _Available since v3.1._
     */
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    /**
     * @dev Emitted when `account` is granted `role`.
     *
     * `sender` is the account that originated the contract call, an admin role
     * bearer except when using {AccessControl-_setupRole}.
     */
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Emitted when `account` is revoked `role`.
     *
     * `sender` is the account that originated the contract call:
     *   - if using `revokeRole`, it is the admin role bearer
     *   - if using `renounceRole`, it is the role bearer (i.e. `account`)
     */
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
}
