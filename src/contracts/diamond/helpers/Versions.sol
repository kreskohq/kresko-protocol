// SPDX-License-Identifier: MIT
import {LibMeta} from "./LibMeta.sol";

pragma solidity >=0.8.4;

struct VersionInfo {
    uint8 version;
    uint256 blocknumber;
    address updater;
}

library Versions {
    function increment(uint8 _currentVersion) internal returns (VersionInfo memory nextVersion) {
        nextVersion = VersionInfo({
            version: _currentVersion++,
            blocknumber: block.number,
            updater: LibMeta.msgSender()
        });
    }
}
