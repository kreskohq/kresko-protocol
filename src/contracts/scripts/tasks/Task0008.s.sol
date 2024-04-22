// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript, IKreskoAsset} from "scripts/utils/ArbScript.s.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract Task0008 is ArbScript {
    uint256 internal currentForkId;

    function payload0008() public {
        ArbScript.initialize();
        if (currentForkId == 0) {
            currentForkId = vm.createSelectFork("arbitrum");
        }

        broadcastWith(safe);
        krETH.setCloseFee(15);
        IKreskoAsset(krBTCAddr).setCloseFee(15);
    }
}
