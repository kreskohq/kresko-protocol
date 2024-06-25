// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AssetAdder} from "scripts/utils/AssetAdder.s.sol";
import {Log} from "kresko-lib/utils/Libs.s.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {KrAssetPayload} from "scripts/payloads/KrAssetPayloads.sol";
import {deployPayload} from "scripts/payloads/Payloads.sol";
import {IExtendedDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";

contract AddKrAsset is AssetAdder {
    using Log for *;

    address payable internal newAssetAddr;

    string assetName = "Silver";
    string assetTicker = "XAG";
    string assetSymbol = string.concat("kr", assetTicker);
    bytes32 marketStatusSource = bytes32("XAG");

    function setUp() public virtual {
        vm.createSelectFork("https://rpc.tenderly.co/fork/d002ed2f-8397-4e60-ba5d-ce5ff57ae6c1");
        Deployed.factory(factoryAddr);
    }

    function createFork() public {
        broadcastWith(safe);
        createAddKrAsset();
        states_looseOracles();
    }

    function createAddKrAsset() public {
        newAssetAddr = _createAddKrAsset();

        IERC20 token = IERC20(newAssetAddr);

        prank(safe);
        fetchPythAndUpdate();
        syncTimeLocal();

        string memory info = string.concat(
            "\n************************************************************",
            "\n* Created ",
            token.symbol(),
            " succesfully.",
            "\n************************************************************",
            "\n* (address)      -> ",
            vm.toString(newAssetAddr),
            "\n* (name)         -> ",
            token.name(),
            "\n* (getPrice)     -> ",
            fpStr(kresko.getPrice(newAssetAddr)),
            "\n* (getPushPrice) -> ",
            fpStr(uint256(kresko.getPushPrice(newAssetAddr).answer)),
            "\n************************************************************"
        );
        Log.clg(info);
        Log.br();
    }

    function fpStr(uint256 value) public pure returns (string memory) {
        return string.concat(vm.toString(value / 1e8), ".", vm.toString(value % 1e8));
    }

    function _createAddKrAsset() private rebroadcasted(safe) returns (address payable krAssetAddr_) {
        krAssetAddr_ = deployKrAsset(assetSymbol);

        address payloadAddr = deployPayload(
            type(KrAssetPayload).creationCode,
            abi.encode(krAssetAddr_),
            string.concat(assetSymbol, "-initializer")
        );
        IExtendedDiamondCutFacet(kreskoAddr).executeInitializer(payloadAddr, abi.encodeCall(KrAssetPayload.executePayload, ()));
    }
}
