// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {AssetAdder} from "scripts/utils/AssetAdder.s.sol";
import {Log} from "kresko-lib/utils/Libs.s.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {PayloadJPY} from "scripts/payloads/KrAssetPayloads.sol";
import {deployPayload} from "scripts/payloads/Payloads.sol";
import {IExtendedDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";

contract AddKrAsset is AssetAdder {
    using Log for *;

    address newAssetAddr;

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_ARBITRUM_URL"));
        Deployed.factory(factoryAddr);
    }

    function krJPYBatch() public {
        broadcastWith(safe);
        newAssetAddr = deployKrAsset("krJPY");
        address payloadAddr = deployPayload(
            type(PayloadJPY).creationCode,
            abi.encode(newAssetAddr),
            bytes32("krJPY-initializer")
        );
        IExtendedDiamondCutFacet(kreskoAddr).executeInitializer(payloadAddr, abi.encodeCall(PayloadJPY.executePayload, ()));
        newAssetAddr.clg("Asset created");
    }
}
