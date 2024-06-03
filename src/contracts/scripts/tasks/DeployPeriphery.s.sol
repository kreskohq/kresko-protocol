// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {KrMulticall} from "periphery/KrMulticall.sol";
import {DataV1} from "periphery/DataV1.sol";
import {ArbDeployAddr} from "kresko-lib/info/ArbDeployAddr.sol";
import {Scripted} from "kresko-lib/utils/Scripted.s.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract DeployPeriphery is Scripted, ArbDeployAddr {
    using Log for *;
    using Help for *;

    function setUp() public {
        useMnemonic("MNEMONIC_DEPLOY");
        vm.createSelectFork("arbitrum");
    }

    function deployMulticall() public broadcastedById(0) {
        KrMulticall newMulticall = new KrMulticall(kreskoAddr, kissAddr, routerv3Addr, wethAddr, pythAddr, safe);
        address(newMulticall).clg("New KrMulticall");
    }

    function deployDataV1() public broadcastedById(0) {
        DataV1 newDataV1 = new DataV1(kreskoAddr, vaultAddr, kissAddr, quoterV2Addr, kreskianAddr, questAddr);
        address(newDataV1).clg("New DataV1");
    }
}
