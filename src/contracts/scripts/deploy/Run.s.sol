// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ArbitrumDeployment} from "./network/Arbitrum.s.sol";
import {LocalDeployment} from "./network/Local.s.sol";
import {state} from "./base/DeployState.s.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {Addr} from "kresko-lib/info/Arbitrum.sol";
import {console2} from "forge-std/console2.sol";

contract Arbitrum is ArbitrumDeployment("MNEMONIC_DEVNET") {
    uint32[USER_COUNT] testUsers = [0, 1, 2, 3, 4, 5];

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
        AssetCfg memory assetCfg = super.createAssetConfig();
        CoreConfig memory coreCfg = super.createCoreConfig(admin, treasury);

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

    function writeDeploymentJSON() internal {
        string memory obj = "deployment";
        vm.serializeString(obj, "EMPTY", "0xEMPTY");
        vm.serializeAddress(obj, "KISS", address(state().kiss));
        vm.serializeAddress(obj, "USDC", address(USDC));
        vm.serializeAddress(obj, "USDC.e", address(USDCe));
        vm.serializeAddress(obj, "ETH", 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
        vm.serializeAddress(obj, "WETH", address(WETH));
        vm.serializeAddress(obj, "WBTC", address(WBTC));
        vm.serializeAddress(obj, "USDT", address(USDT));
        vm.serializeAddress(obj, "DAI", address(DAI));
        vm.serializeAddress(obj, "krETH", krETH.addr);
        vm.serializeAddress(obj, "krBTC", krBTC.addr);
        vm.serializeAddress(obj, "krEUR", krEUR.addr);
        vm.serializeAddress(obj, "krJPY", krJPY.addr);
        vm.serializeAddress(obj, "krWTI", krWTI.addr);
        vm.serializeAddress(obj, "krXAU", krXAU.addr);
        vm.serializeAddress(obj, "Vault", address(state().vault));
        vm.serializeAddress(obj, "UniswapRouter", Addr.V3_Router02);
        vm.serializeAddress(obj, "DataV1", address(state().dataProvider));
        vm.serializeAddress(obj, "Kresko", address(state().kresko));
        vm.serializeAddress(obj, "Multicall", address(state().multicall));
        string memory output = vm.serializeAddress(obj, "Factory", address(state().factory));
        vm.writeJson(output, "./out/arbitrum.json");
        console2.log("Deployment JSON written to: ./out/arbitrum.json");
    }
}

contract Local is LocalDeployment("MNEMONIC_DEVNET") {
    uint32[USER_COUNT] testUsers = [0, 1, 2, 3, 4, 5];

    function run() external {
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
        CoreConfig memory coreCfg = super.createCoreConfig(admin, treasury);

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

    function writeDeploymentJSON() internal {
        string memory obj = "deployment";
        vm.serializeString(obj, "EMPTY", "0xEMPTY");
        vm.serializeAddress(obj, "KISS", address(state().kiss));
        vm.serializeAddress(obj, "USDC", address(USDC));
        vm.serializeAddress(obj, "USDC.e", address(USDCe));
        vm.serializeAddress(obj, "ETH", 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
        vm.serializeAddress(obj, "WETH", address(WETH));
        vm.serializeAddress(obj, "WBTC", address(WBTC));
        vm.serializeAddress(obj, "USDT", address(USDT));
        vm.serializeAddress(obj, "DAI", address(DAI));
        vm.serializeAddress(obj, "krETH", krETH.addr);
        vm.serializeAddress(obj, "krBTC", krBTC.addr);
        vm.serializeAddress(obj, "krEUR", krEUR.addr);
        vm.serializeAddress(obj, "krJPY", krJPY.addr);
        vm.serializeAddress(obj, "krWTI", krWTI.addr);
        vm.serializeAddress(obj, "krXAU", krXAU.addr);
        vm.serializeAddress(obj, "Vault", address(state().vault));
        vm.serializeAddress(obj, "UniswapRouter", address(0));
        vm.serializeAddress(obj, "DataV1", address(state().dataProvider));
        vm.serializeAddress(obj, "Kresko", address(state().kresko));
        vm.serializeAddress(obj, "Multicall", address(state().multicall));
        string memory output = vm.serializeAddress(obj, "Factory", address(state().factory));
        vm.writeJson(output, "./out/local.json");
        console2.log("Deployment JSON written to: ./out/local.json");
    }
}
