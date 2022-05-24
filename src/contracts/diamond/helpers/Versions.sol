// SPDX-License-Identifier: MIT

pragma solidity >=0.8.4;

struct VersionInfo {
    uint8 version;
    uint256 blocknumber;
    address updater;
}

library Versions {
    function increment(uint8 _version) internal {
        unchecked {
            _version._value += 1;
        }
    }

    function decrement(Counter storage counter) internal {
        uint256 value = counter._value;
        require(value > 0, "Counter: decrement overflow");
        unchecked {
            counter._value = value - 1;
        }
    }

    function reset(Counter storage counter) internal {
        counter._value = 0;
    }
}
