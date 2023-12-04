// solhint-disable code-complexity, state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {LocalDeployment} from "../config/LocalnetConfig.s.sol";
import {LibDeploy} from "scripts/utils/libs/LibDeploy.s.sol";
import {JSON, LibConfig} from "scripts/utils/libs/LibConfig.s.sol";
import {LibMocks} from "scripts/utils/libs/LibMocks.s.sol";
import {KreskoDeployment} from "scripts/utils/KreskoDeployment.s.sol";
import {ScriptBase} from "kresko-lib/utils/ScriptBase.s.sol";
import {IKresko} from "periphery/IKresko.sol";
import {Vault} from "vault/Vault.sol";
import {Log} from "kresko-lib/utils/Libs.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {LibOutput} from "scripts/utils/libs/LibOutput.s.sol";
import {Asset} from "common/Types.sol";
import {DeploymentFactory} from "factory/DeploymentFactory.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {LibUsers} from "scripts/utils/libs/LibUsers.s.sol";

contract LocalnetNew is ScriptBase("MNEMONIC_DEVNET"), KreskoDeployment {
    using LibOutput for Asset;
    using LibOutput for VaultAsset;
    using Log for *;
    mapping(string => bool) internal tickersAdded;
    mapping(bytes32 => bool) internal routesAdded;
    SwapRouteSetter[] internal tradeRoutes;

    function run(string memory configId, uint32 deployer) public {
        deploy(configId, getAddr(deployer));
    }

    function deploy(string memory configId, address deployer) internal broadcastWithAddr(deployer) {
        JSON.ChainConfig memory chainConfig = LibConfig.getChainConfig(configId);
        JSON.Assets memory assetConfig = LibConfig.getAssetConfig(configId);

        // Create deployment factory first
        DeploymentFactory factory = LibDeploy.createFactory(deployer);

        // Create mocks if needed
        if (assetConfig.mocked) {
            vm.warp(vm.unixTime());
            (assetConfig, chainConfig.common.sequencerUptimeFeed, chainConfig.common.council) = LibMocks.createMocks(
                chainConfig.common.admin,
                assetConfig
            );
            (chainConfig.periphery.officallyKreskianNFT, chainConfig.periphery.questForKreskNFT) = LibMocks.createNFTMocks();
        }

        // Gating managerrrrrr
        LibDeploy.createGatingManager(chainConfig);

        // Create base contracts
        kresko = super.deployDiamond(chainConfig);
        vault = LibDeploy.createVault(chainConfig, assetConfig.kiss);
        kiss = LibDeploy.createKISS(address(kresko), address(vault), chainConfig, assetConfig.kiss);
        assetConfig = LibDeploy.createKrAssets(address(kresko), chainConfig, assetConfig);

        /* ---------------------------- Externals --------------------------- */
        for (uint256 i; i < assetConfig.extAssets.length; i++) {
            JSON.ExtAssetConfig memory ext = assetConfig.extAssets[i];
            (JSON.TickerConfig memory ticker, address[2] memory feeds) = LibConfig.getOracle(
                ext.config.ticker,
                ext.config.oracles,
                assetConfig.tickers
            );

            kresko.addAsset(ext.addr, ext.config.toAsset(), !tickersAdded[ticker.ticker] ? feeds : [address(0), address(0)]);
            tickersAdded[ticker.ticker] = true;
        }

        /* ------------------------------ KrAssets ------------------------------ */
        (, address[2] memory kissFeeds) = LibConfig.getOracle(
            assetConfig.kiss.config.ticker,
            assetConfig.kiss.config.oracles,
            assetConfig.tickers
        );

        kresko.addAsset(address(kiss), assetConfig.kiss.config.toAsset(), kissFeeds).print(address(kresko), address(kiss));

        for (uint256 i; i < assetConfig.kreskoAssets.length; i++) {
            JSON.KrAssetConfig memory krAsset = assetConfig.kreskoAssets[i];
            (JSON.TickerConfig memory ticker, address[2] memory feeds) = LibConfig.getOracle(
                krAsset.config.ticker,
                krAsset.config.oracles,
                assetConfig.tickers
            );
            address addr = LibDeploy.state().krAssets[krAsset.symbol].addr;

            kresko
                .addAsset(addr, krAsset.config.toAsset(), !tickersAdded[ticker.ticker] ? feeds : [address(0), address(0)])
                .print(address(kresko), addr);
            tickersAdded[ticker.ticker] = true;
        }

        /* -------------------------- Vault Assets -------------------------- */
        VaultAsset[] memory vaultAssets = LibConfig.getVaultAssetConfig(configId);
        for (uint256 i; i < vaultAssets.length; i++) {
            vault.addAsset(vaultAssets[i]).print(address(vault));
        }

        LibOutput.getAllTradeRoutes(tradeRoutes, address(factory), address(kiss), assetConfig, routesAdded);
        kresko.setSwapRoutesSCDP(tradeRoutes);
        delete tradeRoutes;

        LibOutput.getCustomTradeRoutes(tradeRoutes, address(factory), assetConfig);
        for (uint256 i; i < tradeRoutes.length; i++) {
            kresko.setSingleSwapRouteSCDP(tradeRoutes[i]);
        }
        delete tradeRoutes;

        /* ---------------------------- Periphery --------------------------- */
        multicall = LibDeploy.createMulticall(address(kresko), address(kiss), chainConfig);
        dataV1 = LibDeploy.createDataV1(address(kresko), address(vault), address(kiss), chainConfig);

        factory.transferOwnership(chainConfig.common.admin);

        /* ------------------------------ Users ----------------------------- */
        JSON.UserConfig memory userCfg = LibConfig.getUserConfig(configId);
        if (userCfg.chainId != 0) {
            for (uint256 i; i < userCfg.users.length; i++) {
                address user = getAddr(userCfg.users[i]);
                if (assetConfig.mocked) {
                    broadcastWith(user);
                    LibUsers.mockMint(user, address(factory), userCfg, assetConfig);
                    LibUsers.mintKissMocked(
                        user,
                        userCfg.kissAmount,
                        address(vaultAssets[0].token),
                        address(vault),
                        address(kiss)
                    );
                }

                LibOutput.printUser(user, address(kiss), assetConfig, userCfg);
            }
        }

        if (assetConfig.mocked) {
            LibUsers.mintMockNFTs([getAddr(0), getAddr(1), getAddr(2), getAddr(3)], chainConfig);
        }

        /* ------------------------------ Finish ----------------------------- */
    }
}

contract Localnet is LocalDeployment("MNEMONIC_DEVNET") {
    string internal constant configId = "localhost";

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
        factory = super.deployDeploymentFactory(admin);
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
        factory.transferOwnership(admin);
    }
}
