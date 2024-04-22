// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {KrMulticall} from "periphery/KrMulticall.sol";
import {Role} from "common/Constants.sol";
import {DataV1} from "periphery/DataV1.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract DeployMulticall is ArbScript {
    using Log for *;
    using Help for *;

    function run() public {
        ArbScript.initialize();
        broadcastWith("PRIVATE_KEY_05A");
        DataV1 newDataV1 = new DataV1(kreskoAddr, vaultAddr, kissAddr, address(quoter), kreskianAddr, questAddr);
        address(newDataV1).clg("New dataV1");
    }
}
