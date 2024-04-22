// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract Task0007 is ArbScript {
    uint256 internal currentForkId;

    function payload0007() public {
        ArbScript.initialize();
        if (currentForkId == 0) {
            currentForkId = vm.createSelectFork("arbitrum");
        }

        broadcastWith(safe);
        IGatingManager(kresko.getGatingManager()).setPhase(2);
    }
}
