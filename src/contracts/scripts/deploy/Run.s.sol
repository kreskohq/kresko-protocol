// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ArbitrumDeployment} from "./network/Arbitrum.s.sol";
import {LocalDeployment} from "./network/Local.s.sol";
import {state} from "./base/DeployState.s.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {Addr, Tokens} from "kresko-lib/info/Arbitrum.sol";
import {console2} from "forge-std/console2.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {IKresko} from "periphery/IKresko.sol";
import {KISS} from "kiss/KISS.sol";
import {GatingManager} from "periphery/GatingManager.sol";

interface INFT {
    function mint(address to, uint256 tokenId, uint256 amount) external;

    function grantRole(bytes32 role, address to) external;

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) external;

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external;
}

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
        vm.serializeAddress(obj, "GatingManager", address(state().gatingManager));
        string memory output = vm.serializeAddress(obj, "Factory", address(state().factory));
        vm.writeJson(output, "./out/arbitrum.json");
        console2.log("Deployment JSON written to: ./out/arbitrum.json");
    }

    function createUsers() external {
        kresko = IKresko(getDeployed(".Kresko"));
        __current_kresko = address(kresko);
        kiss = KISS(getDeployed(".KISS"));

        address krETHAddr = getDeployed(".krETH");
        address krJPYAddr = getDeployed(".krJPY");

        for (uint256 i; i < testUsers.length; i++) {
            uint256 usdcDepositAmount = i == 1 ? 500e6 : 50000e6;

            uint256 wethDepositAmount = i == 1 ? 0.05 ether : 10 ether;
            uint256 wethCollateralAMount = i == 1 ? 0.02 ether : 5 ether;

            uint256 usdcKissDepositAmount = i == 1 ? 100e6 : 10000e6;
            uint256 krJpyMintAmount = i == 1 ? 5000 ether : 1000000 ether;
            uint256 krEthMintAmount = i == 1 ? 0.01 ether : 5 ether;

            address user = getAddr(testUsers[i]);
            broadcastWith(user);
            Tokens.USDC.approve(address(kresko), usdcDepositAmount);
            Tokens.WETH.approve(address(kresko), wethDepositAmount);
            Tokens.USDC.approve(address(kiss), usdcKissDepositAmount);

            kiss.vaultDeposit(Addr.USDC, usdcKissDepositAmount, user);

            kresko.depositCollateral(user, Addr.USDC, usdcDepositAmount);

            Tokens.WETH.deposit{value: wethDepositAmount}();
            kresko.depositCollateral(user, Addr.WETH, wethCollateralAMount);

            call(kresko.mintKreskoAsset.selector, user, krETHAddr, krEthMintAmount, user, initialPrices);
            call(kresko.mintKreskoAsset.selector, user, krJPYAddr, krJpyMintAmount, user, initialPrices);
            vm.stopBroadcast();
        }

        broadcastWith(getAddr(0));
        GatingManager(getDeployed(".GatingManager")).setPhase(1);
        vm.stopBroadcast();
    }

    function setupWBTC() external {
        vm.startBroadcast(0x4bb7f4c3d47C4b431cb0658F44287d52006fb506);
        for (uint256 i; i < testUsers.length; i++) {
            address user = getAddr(testUsers[i]);
            MockERC20(Addr.WBTC).transfer(user, 0.25e8);
        }
        vm.stopBroadcast();
        console2.log("WBTC sent to users");
    }

    function setupNFTs() external {
        address nftOwner = 0x99999A0B66AF30f6FEf832938a5038644a72180a;
        vm.startBroadcast(nftOwner);
        INFT kreskian = INFT(Addr.OFFICIALLY_KRESKIAN);
        INFT questForKresko = INFT(Addr.QUEST_FOR_KRESK);

        kreskian.safeTransferFrom(nftOwner, getAddr(0), 0, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 0, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 1, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 2, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 3, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 4, 1, "");

        kreskian.safeTransferFrom(nftOwner, getAddr(1), 0, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(1), 0, 1, "");

        kreskian.safeTransferFrom(nftOwner, getAddr(2), 0, 1, "");
        vm.stopBroadcast();
    }

    function setupStables() external {
        vm.startBroadcast(0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D);
        for (uint256 i; i < testUsers.length; i++) {
            address user = getAddr(testUsers[i]);
            MockERC20(Addr.USDC).transfer(user, 100000e6);
            MockERC20(Addr.USDCe).transfer(user, 7500e6);
            MockERC20(Addr.DAI).transfer(user, 25000 ether);
            MockERC20(Addr.USDT).transfer(user, 5000e6);
        }
        vm.stopBroadcast();
        console2.log("USDCe sent to users");
    }

    function getDeployed(string memory key) internal view returns (address) {
        string memory json = vm.readFile(string.concat(vm.projectRoot(), "/out/arbitrum.json"));
        return vm.parseJsonAddress(json, key);
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

    function getDeployed(string memory key) internal view returns (address) {
        string memory json = vm.readFile(string.concat(vm.projectRoot(), "/out/local.json"));
        return vm.parseJsonAddress(json, key);
    }
}
