// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ArbitrumDeployment} from "./network/Arbitrum.s.sol";
import {LocalDeployment} from "./network/Local.s.sol";

import {$} from "./base/DeployContext.s.sol";
import {console2} from "forge-std/console2.sol";

contract Arbitrum is ArbitrumDeployment("MNEMONIC_DEVNET") {
    uint32[USER_COUNT] testUserIds = [0, 1, 2, 3, 4, 5];

    function run() external broadcastWithIdx(0) {
        // prepare
        AssetCfg memory assetCfg = createAssetConfig();
        UserCfg[] memory userCfg = createUserConfig(testUserIds);
        CoreConfig memory coreCfg = createCoreConfig();

        // deploys
        address kreskoAddr = createCore(coreCfg);
        address vaultAddr = createVault(coreCfg, kreskoAddr);
        KISSInfo memory kissInfo = createKISS(coreCfg, kreskoAddr, vaultAddr);
        KrAssetDeployInfo[] memory krAssetInfos = createKrAssets(coreCfg, assetCfg);

        // apply configs
        AssetsOnChain memory assets;
        assets = configureAssets(assetCfg, krAssetInfos, kissInfo, kreskoAddr);
        assets = configureVaultAssets(assetCfg, vaultAddr);
        configureSwaps(kreskoAddr, kissInfo.addr);
        configureUsers(userCfg, assets);
    }

    function onConfigurationsCreated(
        $.Ctx storage _ctx,
        CoreConfig memory _core,
        AssetCfg memory _assets,
        UserCfg[] memory _users
    ) internal override {
        console2.log("Configurations created:");
        console2.log("deployer: %s", _ctx.deployer);
        console2.log("sender: %s", _ctx.msgSender);

        console2.log("Test Users: ", _users.length);
        console2.log("External Assets: ", _assets.ext.length);
        console2.log("Kresko Assets: ", _assets.kra.length);
        console2.log("Vault Assets: ", _assets.vassets.length);
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

contract Local is LocalDeployment("MNEMONIC_DEVNET") {
    uint32[USER_COUNT] testUserIds = [0, 1, 2, 3, 4, 5];
    address deployer = getAddr(0);

    function run() external {
        // configs
        UserCfg[] memory userCfg = createUserConfig(testUserIds);
        vm.deal(deployer, 100 ether);
        AssetsOnChain memory assets = deployment();
        configureUsers(userCfg, assets);
    }

    function deployment() internal broadcastWith(_deployer) {
        AssetCfg memory assetCfg = createAssetConfig();
        CoreConfig memory coreCfg = createCoreConfig();

        // deploys
        address kreskoAddr = createCore(coreCfg);
        address vaultAddr = createVault(coreCfg, kreskoAddr);
        KISSInfo memory kissInfo = createKISS(coreCfg, kreskoAddr, vaultAddr);
        KrAssetDeployInfo[] memory krAssetInfos = createKrAssets(coreCfg, assetCfg);

        // apply configs
        AssetsOnChain memory assets;
        assets = configureAssets(assetCfg, krAssetInfos, kissInfo, kreskoAddr);
        assets = configureVaultAssets(assetCfg, vaultAddr);
        configureSwaps(kreskoAddr, kissInfo.addr);
    }

    function onConfigurationsCreated(
        $.Ctx storage _ctx,
        CoreConfig memory _core,
        AssetCfg memory _assets,
        UserCfg[] memory _users
    ) internal override {
        console2.log("Configurations created:");
        console2.log("sender: %s", _ctx.msgSender);
        console2.log("admin: %s", _core.admin);
        console2.log("balanceOf", address(getAddr(0)).balance);
        console2.log("Test Users: ", _users.length);
        console2.log("External Assets: ", _assets.ext.length);
        console2.log("Kresko Assets: ", _assets.kra.length);
        console2.log("Vault Assets: ", _assets.vassets.length);
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
