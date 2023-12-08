// solhint-disable state-visibility
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {VM, Help} from "kresko-lib/utils/Libs.s.sol";
import {PLog} from "kresko-lib/utils/PLog.s.sol";

library Deployed {
    using Help for *;
    string constant SCRIPT_LOCATION = "utils/deployUtils.js";

    struct Cache {
        mapping(string => address) cache;
    }

    function addr(string memory name) internal returns (address) {
        return addr(name, block.chainid);
    }

    function addr(string memory name, uint256 chainId) internal returns (address) {
        string[] memory args = new string[](5);
        args[0] = "node";
        args[1] = SCRIPT_LOCATION;
        args[2] = "getDeployment";
        args[3] = name;
        args[4] = chainId.str();

        return VM.ffi(args).str().toAddr();
    }

    function cache(string memory id, address _addr) internal returns (address) {
        ensureAddr(id, _addr);
        return (state().cache[id] = _addr);
    }

    function cached(string memory id) internal view returns (address result) {
        result = state().cache[id];
        ensureAddr(id, result);
    }

    function ensureAddr(string memory id, address _addr) internal pure {
        if (_addr == address(0)) revert(string.concat("!exists: ", id));
    }

    function state() internal pure returns (Cache storage ds) {
        bytes32 slot = bytes32("DEPLOY_CACHE");
        assembly {
            ds.slot := slot
        }
    }
}
