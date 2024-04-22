// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ArbDeployAddr} from "kresko-lib/info/ArbDeployAddr.sol";
import {cs} from "common/State.sol";
import {ProtocolUpgrader} from "scripts/utils/ProtocolUpgrader.s.sol";
import {ms} from "minter/MState.sol";
import {Arrays} from "libs/Arrays.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract Payload0006 is ArbDeployAddr {
    using Arrays for address[];

    function initialize() public {
        require(cs().assets[kissAddr].maxDebtMinter != 0, "zero");
        require(cs().assets[kissAddr].maxDebtMinter == 140_000 ether, "already-initialized");

        cs().assets[kissAddr].maxDebtMinter = 60_000 ether;
        ms().krAssets.pushUnique(kissAddr);
    }
}

contract MinterCapLogicUpdate is ProtocolUpgrader, ArbScript {
    using Log for *;
    using Help for *;

    address sender;

    function setUp() public virtual {
        vm.createSelectFork("arbitrum");
        useMnemonic("MNEMONIC");
        sender = getAddr(0);
        initUpgrader(kreskoAddr);
    }

    function payload0006() public output("minter-caps-update") {
        broadcastWith(sender);
        initializer.initContract = address(new Payload0006());
        initializer.initData = abi.encodeWithSelector(Payload0006.initialize.selector);

        createFacetCut("MinterMintFacet");
        createFacetCut("MinterStateFacet");

        broadcastWith(safe);
        executeCuts("MinterLogicUpdate", false);
    }

    function afterRun() public {}
}
