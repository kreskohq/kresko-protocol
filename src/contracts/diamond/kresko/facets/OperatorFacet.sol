// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {DSModifiers} from "../../shared/storage/DS.sol";
import {AccessEvent} from "../../shared/libraries/LibEvents.sol";
import {IOwnership} from "../../shared/interfaces/IOwnership.sol";
import {KS} from "../storage/KS.sol";

contract OperatorFacet is DSModifiers {
    /* -------------------------------------------------------------------------- */
    /*                                    Write                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Toggles a trusted contract to perform restricted actions on targets (eg. helper contracts).
     * @notice Can be only performed by the owner of this diamond storage
     * @param _operator contract that is trusted.
     * @param _target contract allowed to operate on
     */
    function toggleOperator(address _operator, address _target) external onlyOwner {
        KS.toggleOperator(_operator, _target);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Read                                    */
    /* -------------------------------------------------------------------------- */

    function isOperatorFor(address _operator, address _target) external view returns (bool) {
        return KS.s().operators[_operator][_target];
    }
}
