// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AssetAdder} from "scripts/utils/AssetAdder.s.sol";
import {Log, Utils} from "kresko-lib/utils/s/LibVm.s.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {KrAssetPayload} from "scripts/payloads/KrAssetPayloads.sol";
import {deployPayload} from "scripts/payloads/Payloads.sol";
import {IExtendedDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";

contract AddKrAsset is AssetAdder {
    using Log for *;
    using Utils for *;

    address payable internal newAssetAddr;

    string assetName = "Dogecoin";
    string assetTicker = "DOGE";
    string assetSymbol = string.concat("kr", assetTicker);
    bytes32 marketStatusSource = bytes32("CRYPTO");

    function setUp() public virtual {
        vm.createSelectFork("arbitrum");
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
        updatePyth();
        syncTime();

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
            kresko.getPrice(newAssetAddr).strDec(8),
            "\n* (getPushPrice) -> ",
            (uint256(kresko.getPushPrice(newAssetAddr).answer)).strDec(8),
            "\n************************************************************"
        );
        Log.clg(info);
        Log.br();
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
