// solhint-disable
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {LocalSetup, ArbitrumSetup} from "./Setup.s.sol";

import {$} from "./DeployContext.s.sol";
import {console2} from "forge-std/console2.sol";

contract ArbitrumOne is ArbitrumSetup("MNEMONIC_DEVNET") {
    function run() external broadcastWithIdx(0) {
        // prepare
        AssetCfg memory assetCfg = createAssetConfigs();
        CoreConfig memory cfg = createCoreConfig();
        // deploys
        address kreskoAddr = createCore(cfg);
        address vaultAddr = createVault(cfg, kreskoAddr);
        KISSInfo memory kissInfo = createKISS(cfg, kreskoAddr, vaultAddr);
        KrAssetDeployInfo[] memory krAssetInfos = createKrAssets(cfg, assetCfg);
        // configure
        configureAssets(assetCfg, krAssetInfos, kissInfo, kreskoAddr);
        configureVaultAssets(assetCfg, vaultAddr);
        configureSwaps(kreskoAddr, kissInfo.addr);
        // createUsers([]);
    }

    function onConfigurationsCreated($.Ctx storage _ctx, CoreConfig memory _cfg, AssetCfg memory _assetCfg) internal override {
        console2.log("Configurations");
    }

    function onCoreContractsCreated($.Ctx storage _ctx) internal override {
        console2.log("Deployed diamond @", address(_ctx.kresko));
        console2.log("Deployed proxy factory @", address(_ctx.proxyFactory));
    }

    function onContractsCreated($.Ctx storage _ctx) internal override {
        console2.log("All contracts created");
    }

    function onKrAssetAdded($.Ctx storage _ctx, KrAssetInfo memory _info) internal override {
        console2.log("Added (krAsset):", _info.symbol);
    }

    function onExtAssetAdded($.Ctx storage _ctx, ExtAssetInfo memory _info) internal override {
        console2.log("Added (ext):", _info.symbol);
    }

    function onComplete($.Ctx storage _ctx) internal override {
        console2.log("onComplete");
    }
}

contract Local is LocalSetup("MNEMONIC_DEVNET") {
    function run() external {
        vm.startPrank(getAddr(0));
        // prepare
        AssetCfg memory assetCfg = createAssetConfigs();
        CoreConfig memory cfg = createCoreConfig();
        // deploys
        address kreskoAddr = createCore(cfg);
        address vaultAddr = createVault(cfg, kreskoAddr);
        KISSInfo memory kissInfo = createKISS(cfg, kreskoAddr, vaultAddr);
        KrAssetDeployInfo[] memory krAssetInfos = createKrAssets(cfg, assetCfg);
        // configure
        configureAssets(assetCfg, krAssetInfos, kissInfo, kreskoAddr);
        configureVaultAssets(assetCfg, vaultAddr);
        configureSwaps(kreskoAddr, kissInfo.addr);
        vm.stopPrank();
    }

    function onConfigurationsCreated($.Ctx storage _ctx, CoreConfig memory _cfg, AssetCfg memory _assetCfg) internal override {
        console2.log("Configurations");
    }

    function onCoreContractsCreated($.Ctx storage _ctx) internal override {
        console2.log("Deployed diamond @", address(_ctx.kresko));
        console2.log("Deployed proxy factory @", address(_ctx.proxyFactory));
    }

    function onContractsCreated($.Ctx storage _ctx) internal override {
        console2.log("All contracts created");
    }

    function onKrAssetAdded($.Ctx storage _ctx, KrAssetInfo memory _info) internal override {
        console2.log("Added (krAsset):", _info.symbol);
    }

    function onExtAssetAdded($.Ctx storage _ctx, ExtAssetInfo memory _info) internal override {
        console2.log("Added (ext):", _info.symbol);
    }

    function onComplete($.Ctx storage _ctx) internal override {
        console2.log("onComplete");
    }
}
