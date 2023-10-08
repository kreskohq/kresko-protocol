// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {FixedPointMathLib} from "solmate/utils/FixedPointMathLib.sol";
import {IKreskoAsset} from "./IKreskoAsset.sol";

library Rebaser {
    using FixedPointMathLib for uint256;

    /**
     * @notice Unrebase a value by a given rebase struct.
     * @param self The value to unrebase.
     * @param _rebase The rebase struct.
     * @return The unrebased value.
     */
    function unrebase(uint256 self, IKreskoAsset.Rebase memory _rebase) internal pure returns (uint256) {
        if (_rebase.denominator == 0) return self;
        return _rebase.positive ? self.divWadDown(_rebase.denominator) : self.mulWadDown(_rebase.denominator);
    }

    /**
     * @notice Rebase a value by a given rebase struct.
     * @param self The value to rebase.
     * @param _rebase The rebase struct.
     * @return The rebased value.
     */
    function rebase(uint256 self, IKreskoAsset.Rebase memory _rebase) internal pure returns (uint256) {
        if (_rebase.denominator == 0) return self;
        return _rebase.positive ? self.mulWadDown(_rebase.denominator) : self.divWadDown(_rebase.denominator);
    }
}
