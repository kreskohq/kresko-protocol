// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;
import {IERC20Upgradeable} from "../../shared/IERC20Upgradeable.sol";

interface IKISS {
    function pendingOperatorUnlockTime() external returns (uint256);

    function pendingOperator() external returns (address);

    function maxOperators() external returns (uint256);

    function setMaxOperators(uint256 _maxMinters) external;

    function kresko() external returns (address);
}
