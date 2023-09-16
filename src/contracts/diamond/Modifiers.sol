// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {Meta} from "libs/Meta.sol";
import {Error} from "common/Errors.sol";
import {Auth} from "common/Auth.sol";
import {NOT_ENTERED, ENTERED} from "common/Types.sol";
import {ds} from "diamond/State.sol";

abstract contract DSModifiers {
    /**
     * @dev Modifier that checks that an account has a specific role. Reverts
     * with a standardized message including the required role.
     *
     * The format of the revert reason is given by the following regular expression:
     *
     *  /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/
     *
     * _Available since v4.1._
     */
    modifier onlyRole(bytes32 role) {
        Auth.checkRole(role);
        _;
    }

    /**
     * @notice Ensure only trusted contracts can act on behalf of `_account`
     * @param _accountIsNotMsgSender The address of the collateral asset.
     */
    modifier onlyRoleIf(bool _accountIsNotMsgSender, bytes32 role) {
        if (_accountIsNotMsgSender) {
            Auth.checkRole(role);
        }
        _;
    }

    modifier onlyOwner() {
        require(Meta.msgSender() == ds().contractOwner, Error.DIAMOND_INVALID_OWNER);
        _;
    }

    modifier onlyPendingOwner() {
        require(Meta.msgSender() == ds().pendingOwner, Error.DIAMOND_INVALID_PENDING_OWNER);
        _;
    }

    modifier nonReentrant() {
        require(ds().entered == NOT_ENTERED, Error.RE_ENTRANCY);
        ds().entered = ENTERED;
        _;
        ds().entered = NOT_ENTERED;
    }
}
