// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract Task0006 is ArbScript {
    uint256 internal currentForkId;
    address acc1 = 0x5a6B3E907b83DE2AbD9010509429683CF5ad5984;
    address acc3 = 0x7BF50060a0C3EE0ba4073CF33E39a18304A7586E;

    IGatingManager newManager = IGatingManager(0xaFF08b22E3583b2ad34cb2434DAbc39A754B828C);

    function payload0006() public {
        ArbScript.initialize();
        if (currentForkId == 0) {
            currentForkId = vm.createSelectFork("arbitrum");
        }

        broadcastWith(safe);
        kresko.setGatingManager(address(newManager));
        newManager.whitelist(acc1, true);
        newManager.whitelist(acc3, true);
    }
}
