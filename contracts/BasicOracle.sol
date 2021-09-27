// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

contract BasicOracle is Ownable {
    address public reporter;
    // Intended to be a FixedPoint.Unsigned with 18 decimals.
    uint256 public value;

    event SetReporter(address oracle);

    modifier onlyReporter() {
        require(msg.sender == reporter, "BasicOracle: sender not oracle");
        _;
    }

    constructor(address reporter_) {
        _setReporter(reporter_);
    }

    function setValue(uint256 newValue) external onlyReporter {
        value = newValue;
    }

    function setReporter(address newReporter) external onlyOwner {
        _setReporter(newReporter);
    }

    function _setReporter(address newReporter) internal {
        reporter = newReporter;
        emit SetReporter(newReporter);
    }
}
