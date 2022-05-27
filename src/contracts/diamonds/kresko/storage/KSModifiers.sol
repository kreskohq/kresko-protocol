// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {LibMeta} from "../../helpers/LibMeta.sol";
import {KS, DS} from "./KS.sol";

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
