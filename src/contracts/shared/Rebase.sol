// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;
import {FixedPointMathLib} from "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";

struct Rebase {
    bool expand;
    uint256 denominator;
}

library RebaseMath {
    using FixedPointMathLib for uint256;

    function unrebase(uint256 self, Rebase memory _rebase) internal pure returns (uint256) {
        if (_rebase.denominator == 0) return self;
        return _rebase.expand ? self.divWadDown(_rebase.denominator) : self.mulWadDown(_rebase.denominator);
    }

    function rebase(uint256 self, Rebase memory _rebase) internal pure returns (uint256) {
        if (_rebase.denominator == 0) return self;
        return _rebase.expand ? self.mulWadDown(_rebase.denominator) : self.divWadDown(_rebase.denominator);
    }
}
