// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ProtocolUpgrader} from "scripts/utils/ProtocolUpgrader.s.sol";
import {DataV2} from "periphery/DataV2.sol";
import {IMarketStatus} from "common/interfaces/IMarketStatus.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract MarketStatusUpdate is ProtocolUpgrader, ArbScript {
    using Log for *;
    using Help for *;

    address sender;
    IMarketStatus provider = IMarketStatus(0xf6188e085ebEB716a730F8ecd342513e72C8AD04);
    DataV2 dataV2;

    function setUp() public virtual {
        vm.createSelectFork("arbitrum");
        initUpgrader(kreskoAddr, factoryAddr, CreateMode.Create2);
    }

    function payload0010() public output("market-status-update") {
        broadcastWith(safe);
        createFacetCut("CommonConfigFacet");
        createFacetCut("CommonStateFacet");
        createFacetCut("AssetStateFacet");
        executeCuts("MarketStatusUpdate", false);
        dataV2 = new DataV2(kreskoAddr, vaultAddr, kissAddr, address(quoter), kreskianAddr, questAddr);
        kresko.setMarketStatusProvider(address(provider));
    }
}
