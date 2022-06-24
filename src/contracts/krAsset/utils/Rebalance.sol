// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;
import {FixedPointMathLib} from "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";

struct Rebalance {
    bool expand;
    uint256 rate;
}

library RebalanceMath {
    using FixedPointMathLib for uint256;

    function rebalanceReverse(uint256 self, Rebalance memory _rebalance) internal pure returns (uint256) {
        return _rebalance.expand ? self.divWadDown(_rebalance.rate) : self.mulWadDown(_rebalance.rate);
    }

    function rebalance(uint256 self, Rebalance memory _rebalance) internal pure returns (uint256) {
        return _rebalance.expand ? self.mulWadDown(_rebalance.rate) : self.divWadDown(_rebalance.rate);
    }
}
