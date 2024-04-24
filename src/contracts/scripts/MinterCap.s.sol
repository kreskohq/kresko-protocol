// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ProtocolUpgrader} from "scripts/utils/ProtocolUpgrader.s.sol";
import {deployPayload} from "scripts/payloads/Payloads.sol";
import {Task0009} from "scripts/tasks/Task0009.s.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract MinterCapLogicUpdate is ProtocolUpgrader, ArbScript {
    using Log for *;
    using Help for *;

    address sender;

    function setUp() public virtual {
        vm.createSelectFork("arbitrum");
        initUpgrader(kreskoAddr, factoryAddr, CreateMode.Create2);
    }

    function payload0009() public output("minter-caps-update") {
        broadcastWith(safe);
        createFacetCut("MinterMintFacet");
        createFacetCut("MinterStateFacet");
        initializer.initContract = deployPayload(type(Task0009).creationCode, "", 9);
        initializer.initData = abi.encodeWithSelector(Task0009.initialize.selector);
        executeCuts("MinterLogicUpdate", false);
    }

    function afterRun() public {}
}
