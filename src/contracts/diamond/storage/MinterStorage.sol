// SPDX-License-Identifier: MIT
/* solhint-disable no-inline-assembly */
/* solhint-disable state-visibility */

pragma solidity 0.8.13;
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import "../libraries/FixedPoint.sol";
import "../libraries/FixedPointMath.sol";
import "../libraries/Arrays.sol";
import "../Errors.sol";

import {LibMeta} from "../libraries/LibMeta.sol";
import {MinterState} from "./MinterStructs.sol";

using FixedPointMath for uint8 global;
using FixedPoint for FixedPoint.Unsigned global;
using FixedPointMath for uint256 global;
using Arrays for address[] global;
using SafeERC20Upgradeable for IERC20MetadataUpgradeable global;
using SafeERC20Upgradeable for IERC20Upgradeable global;

bytes32 constant MINTER_STORAGE_POSITION = keccak256("kresko.minter.storage");

library MinterStorage {

    function initialize() internal {
        state().storageVersion += 1;
        state().initialized = true;
    }

    function state() internal pure returns (MinterState storage ms_) {
        bytes32 position = MINTER_STORAGE_POSITION;
        assembly {
            ms_.slot := position
        }
    }
}
