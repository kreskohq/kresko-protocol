// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
// solhint-disable var-name-mixedcase
// solhint-disable max-states-count
// solhint-disable no-global-import

import {LocalSetup, ArbitrumSetup, $} from "./Setup.s.sol";

contract ArbitrumOne is ArbitrumSetup("MNEMONIC_DEVNET") {
    function run() external broadcastWithIdx(0) {
        // prepare
        $.Assets memory assetCfg = createAssetConfig();
        CoreConfig memory cfg = createCoreConfig();
        // deploys
        address kreskoAddr = createCore(cfg);
        address vaultAddr = createVault(cfg, kreskoAddr);
        KISSDeployInfo memory kissInfo = createKISS(cfg, kreskoAddr, vaultAddr);
        KrAssetDeployInfo[] memory krAssetInfos = createKrAssets(cfg, assetCfg);
        // configure
        configureAssets(assetCfg, krAssetInfos, kissInfo);
        configureVault(assetCfg, vaultAddr);
        configureSwaps(kissInfo.addr);
    }
}

contract Local is LocalSetup("MNEMONIC_DEVNET") {
    function run() external {
        vm.startPrank(getAddr(0));
        // prepare
        $.Assets memory assetCfg = createAssetConfig();
        CoreConfig memory cfg = createCoreConfig();
        // deploys
        address kreskoAddr = createCore(cfg);
        address vaultAddr = createVault(cfg, kreskoAddr);
        KISSDeployInfo memory kissInfo = createKISS(cfg, kreskoAddr, vaultAddr);
        KrAssetDeployInfo[] memory krAssetInfos = createKrAssets(cfg, assetCfg);
        // configure
        configureAssets(assetCfg, krAssetInfos, kissInfo);
        configureVault(assetCfg, vaultAddr);
        configureSwaps(kissInfo.addr);
        vm.stopPrank();
    }
}
