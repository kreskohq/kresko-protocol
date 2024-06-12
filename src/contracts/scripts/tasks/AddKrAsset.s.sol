// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {AssetAdder} from "scripts/utils/AssetAdder.s.sol";
import {Log} from "kresko-lib/utils/Libs.s.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {KrAssetPayload} from "scripts/payloads/KrAssetPayloads.sol";
import {deployPayload} from "scripts/payloads/Payloads.sol";
import {IExtendedDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";

contract AddKrAsset is AssetAdder {
    using Log for *;

    address payable internal newAssetAddr;

    string assetName = "Pound";
    string assetTicker = "GBP";
    string assetSymbol = string.concat("kr", assetTicker);

    function setUp() public virtual {
        vm.createSelectFork("arbitrum");
        Deployed.factory(factoryAddr);
    }

    function createAddKrAsset() public {
        broadcastWith(safe);
        newAssetAddr = deployKrAsset(assetSymbol);

        address payloadAddr = deployPayload(
            type(KrAssetPayload).creationCode,
            abi.encode(newAssetAddr),
            string.concat(assetSymbol, "-initializer")
        );
        IExtendedDiamondCutFacet(kreskoAddr).executeInitializer(payloadAddr, abi.encodeCall(KrAssetPayload.executePayload, ()));
        Log.br();
        newAssetAddr.clg(string.concat(assetSymbol, " deployed @ "));
        Log.hr();
    }
}
