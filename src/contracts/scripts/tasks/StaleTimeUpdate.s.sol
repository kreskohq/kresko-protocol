// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ProtocolUpgrader} from "scripts/utils/ProtocolUpgrader.s.sol";
import {DataV2} from "periphery/DataV2.sol";
import {IMarketStatus} from "common/interfaces/IMarketStatus.sol";
import {deployPayload} from "scripts/payloads/Payloads.sol";
import {AssetAdder} from "scripts/utils/AssetAdder.s.sol";
import {Payload0011} from "scripts/payloads/Payload0011.sol";
import {IExtendedDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract StaleTimeUpdate is ProtocolUpgrader, AssetAdder {
    using Log for *;
    using Help for *;

    address sender;
    address krEURAddr;
    address payloadAddr;
    IMarketStatus provider = IMarketStatus(0xf6188e085ebEB716a730F8ecd342513e72C8AD04);
    DataV2 dataV2;

    function setUp() public virtual {
        useMnemonic("MNEMONIC");
        vm.createSelectFork("https://rpc.tenderly.co/fork/3fc8bc37-2867-4ed3-badb-0b1bab83a731");
        initUpgrader(kreskoAddr, factoryAddr, CreateMode.Create2);
    }

    function createkrEUR() public {
        krEURAddr = deployKrAsset("krEUR");
        payloadAddr = deployPayload(type(Payload0011).creationCode, abi.encode(krEURAddr), 11);
        IExtendedDiamondCutFacet(kreskoAddr).executeInitializer(payloadAddr, abi.encodeCall(Payload0011.executePayload, ()));
    }

    function deployData() external {
        broadcastWith(getAddr(0));
        DataV2 newDataV2 = new DataV2(kreskoAddr, vaultAddr, kissAddr, address(quoter), kreskianAddr, questAddr);
        dataV2 = newDataV2;
        address(dataV2).clg("datav2");
    }

    function execAll() public output("market-status-update") {
        broadcastWith(safe);
        fullUpgrade();
        kresko.setMarketStatusProvider(address(provider));
        createkrEUR();
    }

    bool[] closed = [false];
    bool[] open = [true];
    bytes32[] exchangesNonCrypto = [bytes32(0x464f524558000000000000000000000000000000000000000000000000000000)];
}
