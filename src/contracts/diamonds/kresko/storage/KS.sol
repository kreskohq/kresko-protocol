// SPDX-License-Identifier: MIT
pragma solidity >=0.8.11;

import "../../../libraries/FixedPoint.sol";
import "../../../libraries/FixedPointMath.sol";
import "../../../libraries/Arrays.sol";
import {AccessEvent} from "../../Events.sol";
import {LibMeta} from "../../helpers/LibMeta.sol";

import {DS} from "../../diamond/storage/DS.sol";
import "./KSTypes.sol";

/* solhint-disable no-inline-assembly */
/* solhint-disable state-visibility */

library KS {
    /* -------------------------------------------------------------------------- */
    /*                              Kresko Storage                                */
    /* -------------------------------------------------------------------------- */

    bytes32 constant KRESKO_STORAGE_POSITION = keccak256("kresko.general.storage");

    function s() internal pure returns (KreskoStorage storage s_) {
        bytes32 position = KRESKO_STORAGE_POSITION;
        assembly {
            s_.slot := position
        }
    }

    /**
     * @notice Toggles a trusted contract to perform restricted actions on targets (eg. helper contracts).
     * @notice Can be only performed by the owner of this diamond storage
     * @param _operator contract that is trusted.
     * @param _target contract allowed to operate on
     */
    function toggleOperator(address _operator, address _target) internal {
        bool allowed = !s().operators[_operator][_target];
        s().operators[_operator][_target] = allowed;

        emit AccessEvent.OperatorToggled(_operator, _target, allowed);
    }
}

/* -------------------------------------------------------------------------- */
/*                                  Modifiers                                 */
/* -------------------------------------------------------------------------- */
