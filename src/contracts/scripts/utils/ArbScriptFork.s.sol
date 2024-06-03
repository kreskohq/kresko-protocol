// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {Anvil} from "scripts/utils/Anvil.s.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {Enums} from "common/Constants.sol";
import {PLog} from "kresko-lib/utils/PLog.s.sol";

abstract contract ArbScriptFork is Anvil, ArbScript {
    using PLog for *;

    function initFork(address sender) internal returns (uint256 forkId) {
        forkId = vm.createSelectFork("localhost");
        Deployed.factory(factoryAddr);
        Anvil.syncTime(0);
        vm.makePersistent(address(pythEP));
        broadcastWith(sender);
        fetchPythAndUpdate();
        vm.stopBroadcast();
        syncForkPrices();
    }

    function syncForkPrices() internal {
        uint256[] memory prices = new uint256[](clAssets.length);
        for (uint256 i; i < clAssets.length; i++) {
            prices[i] = kresko.getPythPrice(kresko.getAsset(clAssets[i]).ticker);
        }

        for (uint256 i; i < clAssets.length; i++) {
            address feed = kresko.getFeedForAddress(clAssets[i], Enums.OracleType.Chainlink);
            IAggregatorV3(feed).latestAnswer().clg("Chainlink Price");
            Anvil.setCLPrice(feed, prices[i]);
        }
    }
}
