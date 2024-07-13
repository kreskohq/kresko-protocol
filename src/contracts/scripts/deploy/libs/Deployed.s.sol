// solhint-disable state-visibility
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Help, Utils, mvm} from "kresko-lib/utils/s/LibVm.s.sol";
import {Asset} from "common/Types.sol";
import {IDeploymentFactory} from "factory/IDeploymentFactory.sol";

library Deployed {
    using Help for *;
    using Utils for *;

    struct Cache {
        string deployId;
        address factory;
        mapping(string => address) cache;
        mapping(string => Asset) assets;
    }

    function addr(string memory name) internal returns (address) {
        return addr(name, block.chainid);
    }

    function factory() internal returns (IDeploymentFactory) {
        if (state().factory == address(0)) {
            return IDeploymentFactory(addr("Factory"));
        }
        return IDeploymentFactory(state().factory);
    }

    function factory(address _factory) internal {
        state().factory = _factory;
    }

    function addr(string memory name, uint256 chainId) internal returns (address) {
        require(!state().deployId.isEmpty(), "deployId is empty");

        string[] memory args = new string[](6);
        args[0] = "bun";
        args[1] = "utils/ffi.ts";
        args[2] = "getDeployment";
        args[3] = name;
        args[4] = chainId.str();
        args[5] = state().deployId;

        return abi.decode(mvm.ffi(args), (address));
    }

    function cache(string memory id, address _addr) internal returns (address) {
        ensureAddr(id, _addr);
        return (state().cache[id] = _addr);
    }

    function cache(string memory id, Asset memory asset) internal returns (Asset memory) {
        state().assets[id] = asset;
        return asset;
    }

    function cached(string memory id) internal view returns (address result) {
        result = state().cache[id];
        ensureAddr(id, result);
    }

    function cachedAsset(string memory id) internal view returns (Asset memory) {
        return state().assets[id];
    }

    function ensureAddr(string memory id, address _addr) internal pure {
        if (_addr == address(0)) {
            revert(string.concat("!exists: ", id));
        }
    }

    function init(string memory deployId) internal {
        state().deployId = deployId;
    }

    function state() internal pure returns (Cache storage ds) {
        bytes32 slot = bytes32("DEPLOY_CACHE");
        assembly {
            ds.slot := slot
        }
    }
}
