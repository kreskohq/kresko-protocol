// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Help, Log} from "kresko-lib/utils/s/LibVm.s.sol";
import {Cutter} from "kresko-lib/utils/ffi/Cutter.s.sol";
import {deployPayload} from "scripts/payloads/Payloads.sol";
import {ArbDeployAddr} from "kresko-lib/info/ArbDeployAddr.sol";
import {Arrays} from "libs/Arrays.sol";
import {gm} from "common/State.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract DiamondCutPayload is ArbDeployAddr {
    using Arrays for address[];

    function initialize() public {
        gm().manager = IGatingManager(address(0));
        revert("DiamondCutPayload: not implemented");
    }
}

contract DiamondCuts is Cutter {
    using Log for *;
    using Help for *;

    function setUp() public virtual {
        useMnemonic("MNEMONIC");
        vm.createSelectFork("arbitrum");
        cutterBase(kreskoAddr, CreateMode.Create2);
    }

    function executeCuts() public broadcasted(safe) withJSON("minter-caps-update") {
        createFacet("MinterMintFacet");
        createFacet("MinterStateFacet");
        createFacet("ViewDataFacet");
        _initializer.initContract = deployPayload(type(DiamondCutPayload).creationCode, "", bytes32("updateId"));
        _initializer.initData = abi.encodeWithSelector(DiamondCutPayload.initialize.selector);
        executeCuts(false);
    }
}
