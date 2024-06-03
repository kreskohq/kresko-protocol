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

    address internal newAssetAddr;

    function setUp() public {
        vm.createSelectFork("arbitrum");
        Deployed.factory(factoryAddr);
    }

    function addKrAsset() public {
        broadcastWith(safe);
        newAssetAddr = deployKrAsset("krJPY");
        address payloadAddr = deployPayload(
            type(KrAssetPayload).creationCode,
            abi.encode(newAssetAddr),
            bytes32("krJPY-initializer")
        );
        IExtendedDiamondCutFacet(kreskoAddr).executeInitializer(payloadAddr, abi.encodeCall(KrAssetPayload.executePayload, ()));
        newAssetAddr.clg("Asset created");
    }
}
