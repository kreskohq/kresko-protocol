// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ArbitrumDeployment} from "./network/Arbitrum.s.sol";
import {ArbitrumSepoliaDeployment} from "./network/ArbitrumSepolia.s.sol";
import {LocalDeployment} from "./network/Local.s.sol";
import {state} from "./base/DeployState.s.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {Addr, Tokens} from "kresko-lib/info/Arbitrum.sol";
import {console2} from "forge-std/console2.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {IKresko} from "periphery/IKresko.sol";
import {KISS} from "kiss/KISS.sol";
import {GatingManager} from "periphery/GatingManager.sol";

contract Arbitrum is ArbitrumDeployment("MNEMONIC_DEVNET") {
    function run() external {
        enableLogger();

        address deployer = getAddr(0);
        address admin = getAddr(0);
        address treasury = getAddr(10);
        vm.deal(deployer, 100 ether);

        UserCfg[] memory userCfg = super.createUserConfig(testUsers);
        AssetsOnChain memory assets = deploy(deployer, admin, treasury);
        super.setupUsers(userCfg, assets);
        super.afterComplete();

        writeDeploymentJSON();
    }

    function deploy(
        address deployer,
        address admin,
        address treasury
    ) internal broadcastWithAddr(deployer) returns (AssetsOnChain memory assets_) {
        // create configurations
        state().gatingManager = new GatingManager(Addr.OFFICIALLY_KRESKIAN, Addr.QUEST_FOR_KRESK, 0);
        AssetCfg memory assetCfg = super.createAssetConfig();
        CoreConfig memory coreCfg = super.createCoreConfig(admin, treasury, address(state().gatingManager));

        // create base contracts
        address kreskoAddr = super.createCore(coreCfg);
        address vaultAddr = super.createVault(coreCfg, kreskoAddr);

        // create assets
        KISSInfo memory kissInfo = super.createKISS(coreCfg, kreskoAddr, vaultAddr);
        KrAssetDeployInfo[] memory krAssetInfos = super.createKrAssets(coreCfg, assetCfg);

        // add assets
        assets_ = super.addAssets(assetCfg, krAssetInfos, kissInfo, kreskoAddr);

        // handle things depending on assets existing
        super.configureSwap(kreskoAddr, assets_);

        // deploy periphery contracts
        super.deployPeriphery();
    }
}

contract ArbitrumSepolia is ArbitrumSepoliaDeployment("MNEMONIC_DEVNET") {
    function run() public {
        enableLogger();

        address deployer = getAddr(0);
        address admin = getAddr(0);
        address treasury = getAddr(10);
        vm.deal(deployer, 100 ether);

        UserCfg[] memory userCfg = super.createUserConfig(testUsers);
        AssetsOnChain memory assets = deploy(deployer, admin, treasury);
        super.setupUsers(userCfg, assets);
        super.afterComplete();

        writeDeploymentJSON();
    }

    function deploy(
        address deployer,
        address admin,
        address treasury
    ) internal broadcastWithAddr(deployer) returns (AssetsOnChain memory assets_) {
        // create configurations
        state().gatingManager = new GatingManager(Addr.OFFICIALLY_KRESKIAN, Addr.QUEST_FOR_KRESK, 0);
        AssetCfg memory assetCfg = super.createAssetConfig();
        CoreConfig memory coreCfg = super.createCoreConfig(admin, treasury, address(state().gatingManager));

        // create base contracts
        address kreskoAddr = super.createCore(coreCfg);
        address vaultAddr = super.createVault(coreCfg, kreskoAddr);

        // create assets
        KISSInfo memory kissInfo = super.createKISS(coreCfg, kreskoAddr, vaultAddr);
        KrAssetDeployInfo[] memory krAssetInfos = super.createKrAssets(coreCfg, assetCfg);

        // add assets
        assets_ = super.addAssets(assetCfg, krAssetInfos, kissInfo, kreskoAddr);

        // handle things depending on assets existing
        super.configureSwap(kreskoAddr, assets_);

        // deploy periphery contracts
        super.deployPeriphery();
    }
}

contract Local is LocalDeployment("MNEMONIC_DEVNET") {
    function run() public {
        enableLogger();

        address deployer = getAddr(0);
        address admin = getAddr(0);
        address treasury = getAddr(10);
        vm.deal(deployer, 100 ether);

        UserCfg[] memory userCfg = super.createUserConfig(testUsers);
        AssetsOnChain memory assets = deploy(deployer, admin, treasury);

        setupUsers(userCfg, assets);

        super.afterComplete();
        writeDeploymentJSON();
    }

    function deploy(
        address deployer,
        address admin,
        address treasury
    ) internal broadcastWithAddr(deployer) returns (AssetsOnChain memory assets_) {
        // create configurations
        AssetCfg memory assetCfg = super.createAssetConfig();
        CoreConfig memory coreCfg = super.createCoreConfig(admin, treasury, address(0));

        // create base contracts
        address kreskoAddr = super.createCore(coreCfg);
        address vaultAddr = super.createVault(coreCfg, kreskoAddr);

        // create assets
        KISSInfo memory kissInfo = super.createKISS(coreCfg, kreskoAddr, vaultAddr);
        KrAssetDeployInfo[] memory krAssetInfos = super.createKrAssets(coreCfg, assetCfg);

        // add assets
        assets_ = super.addAssets(assetCfg, krAssetInfos, kissInfo, kreskoAddr);

        // handle things depending on assets existing
        super.configureSwap(kreskoAddr, assets_);

        // deploy periphery contracts
        super.deployPeriphery();
    }
}
