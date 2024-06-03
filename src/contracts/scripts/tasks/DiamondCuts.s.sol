// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ProtocolUpgrader} from "scripts/utils/ProtocolUpgrader.s.sol";
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

contract DiamondCuts is ProtocolUpgrader, ArbScript {
    using Log for *;
    using Help for *;

    function setUp() public virtual {
        useMnemonic("MNEMONIC");
        vm.createSelectFork("arbitrum");
        initUpgrader(kreskoAddr, factoryAddr, CreateMode.Create2);
    }

    function executeCuts() public broadcasted(safe) output("minter-caps-update") {
        createFacetCut("MinterMintFacet");
        createFacetCut("MinterStateFacet");
        createFacetCut("ViewDataFacet");
        initializer.initContract = deployPayload(type(DiamondCutPayload).creationCode, "", bytes32("updateId"));
        initializer.initData = abi.encodeWithSelector(DiamondCutPayload.initialize.selector);
        executeCuts("MinterLogicUpdate", false);
    }
}
