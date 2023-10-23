// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ArbitrumDeployment} from "./network/Arbitrum.s.sol";
import {LocalDeployment} from "./network/Local.s.sol";

contract Arbitrum is ArbitrumDeployment("MNEMONIC_DEVNET") {
    uint32[USER_COUNT] testUsers = [0, 1, 2, 3, 4, 5];

    function run() external {
        log = true;

        address deployer = getAddr(0);
        address admin = getAddr(0);
        address treasury = getAddr(10);
        vm.deal(deployer, 100 ether);

        UserCfg[] memory userCfg = createUserConfig(testUsers);
        AssetsOnChain memory assets = deploy(deployer, admin, treasury);

        setupUsers(userCfg, assets);
    }

    function deploy(
        address deployer,
        address admin,
        address treasury
    ) internal broadcastWithAddr(deployer) returns (AssetsOnChain memory assets_) {
        // create configurations
        AssetCfg memory assetCfg = createAssetConfig();
        CoreConfig memory coreCfg = createCoreConfig(admin, treasury);

        // create base contracts
        address kreskoAddr = createCore(coreCfg);
        address vaultAddr = createVault(coreCfg, kreskoAddr);

        // create assets
        KISSInfo memory kissInfo = createKISS(coreCfg, kreskoAddr, vaultAddr);
        KrAssetDeployInfo[] memory krAssetInfos = createKrAssets(coreCfg, assetCfg);

        // add assets
        assets_ = addAssets(assetCfg, krAssetInfos, kissInfo, kreskoAddr);

        // handle things depending on assets existing
        configureSwap(kreskoAddr, assets_);
    }
}

contract Local is LocalDeployment("MNEMONIC_DEVNET") {
    uint32[USER_COUNT] testUsers = [0, 1, 2, 3, 4, 5];

    function run() external {
        log = true;

        address deployer = getAddr(0);
        address admin = getAddr(0);
        address treasury = getAddr(10);
        vm.deal(deployer, 100 ether);

        UserCfg[] memory userCfg = createUserConfig(testUsers);
        AssetsOnChain memory assets = deploy(deployer, admin, treasury);

        setupUsers(userCfg, assets);
    }

    function deploy(
        address deployer,
        address admin,
        address treasury
    ) internal broadcastWithAddr(deployer) returns (AssetsOnChain memory assets_) {
        // create configurations
        AssetCfg memory assetCfg = createAssetConfig();
        CoreConfig memory coreCfg = createCoreConfig(admin, treasury);

        // create base contracts
        address kreskoAddr = createCore(coreCfg);
        address vaultAddr = createVault(coreCfg, kreskoAddr);

        // create assets
        KISSInfo memory kissInfo = createKISS(coreCfg, kreskoAddr, vaultAddr);
        KrAssetDeployInfo[] memory krAssetInfos = createKrAssets(coreCfg, assetCfg);

        // add assets
        assets_ = addAssets(assetCfg, krAssetInfos, kissInfo, kreskoAddr);

        // handle things depending on assets existing
        configureSwap(kreskoAddr, assets_);
    }
}
