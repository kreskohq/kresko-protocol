// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {KrMulticall} from "periphery/KrMulticall.sol";
import {Role} from "common/Constants.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract DeployMulticall is ArbScript {
    using Log for *;
    using Help for *;

    address sender;
    address newMulticall = 0xC35A7648B434f0A161c12BD144866bdf93c4a4FC;

    function deploy() public {
        ArbScript.initialize();
        sender = getAddr("PRIVATE_KEY_05A");
        _deploy();
        address(multicall).clg("Multicall");
    }

    function _deploy() internal broadcasted(sender) {
        multicall = new KrMulticall(kreskoAddr, kissAddr, address(swap), wethAddr, address(pythEP), safe);
    }

    function addManagerRole() public {
        ArbScript.initialize();
        sender = getAddr("PRIVATE_KEY_05A");
        broadcastWith(safe);
        kresko.grantRole(Role.MANAGER, newMulticall);
    }

    function afterRun() public {}
}
