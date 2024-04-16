// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {GatingManager} from "periphery/GatingManager.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract Task0006 is ArbScript {
    uint256 internal currentForkId;
    address acc3 = 0x7BF50060a0C3EE0ba4073CF33E39a18304A7586E;

    function payload0006() public returns (address) {
        ArbScript.initialize();
        if (currentForkId == 0) {
            currentForkId = vm.createSelectFork("arbitrum");
        }

        broadcastWith(safe);
        GatingManager newManager = new GatingManager(safe, address(kreskian), address(questForKresk), 1);
        kresko.setGatingManager(address(newManager));
        newManager.whitelist(acc3, true);

        return address(newManager);
    }
}
