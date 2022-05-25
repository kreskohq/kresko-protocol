// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {DS} from "../../diamond/storage/DS.sol";
import {AccessEvent} from "../../events/Events.sol";
import {LibMeta} from "../../helpers/LibMeta.sol";
import "../../../libraries/FixedPoint.sol";
import "../../../libraries/FixedPointMath.sol";
import "../../../libraries/Arrays.sol";

/* solhint-disable no-inline-assembly */
/* solhint-disable state-visibility */

/*
 * General kresko diamond storage
 */
struct KreskoStorage {
    // access control: sender -> facet contract -> bool
    mapping(address => mapping(address => bool)) operators;
    // owner of the contract
    address owner;
    // pending new owner
    address pendingOwner;
    // is the diamond initialized
    bool initialized;
    // domain separator
    bytes32 domainSeparator;
}

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

contract KSModifiers {
    /**
     * @notice Ensure caller is an operator if a condition is true
     * @param _condition triggers the check
     * @param _target triggers the check
     */
    modifier onlyOperatorIf(bool _condition, address _target) {
        if (_condition) {
            require(KS.s().operators[msg.sender][_target], "KR: Must be operator to call this function");
        }
        _;
    }

    /**
     * @notice Ensure caller is an operator
     * @param _target triggers the check
     */
    modifier onlyOperator(address _target) {
        address sender = LibMeta.msgSender();
        require(
            KS.s().operators[sender][_target] || DS.contractOwner() == sender,
            "KR: Must be operator to call this function"
        );
        _;
    }
}
