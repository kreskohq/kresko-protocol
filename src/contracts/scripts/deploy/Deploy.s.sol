// solhint-disable code-complexity, state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {DeployBase} from "scripts/deploy/DeployBase.s.sol";
import {ScriptBase} from "kresko-lib/utils/ScriptBase.s.sol";
import {LibDeployConfig} from "scripts/deploy/libs/LibDeployConfig.s.sol";
import {LibDeployMocks} from "scripts/deploy/libs/LibDeployMocks.s.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {LibDeployUsers} from "scripts/deploy/libs/LibDeployUsers.s.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import {Log} from "kresko-lib/utils/Libs.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {Asset} from "common/Types.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {Ownable} from "@oz/access/Ownable.sol";
import "scripts/deploy/libs/JSON.s.sol" as JSON;

contract Deploy is ScriptBase("MNEMONIC_DEVNET"), DeployBase {
    using Deployed for Asset;
    using Deployed for VaultAsset;

    mapping(string => bool) tickersAdded;
    mapping(bytes32 => bool) routesAdded;
    SwapRouteSetter[] tradeRoutes;

    function run(string memory configId, uint32 deployer, bool saveOutput, bool disableLog, string memory afterDeploy) public {
        if (disableLog) LibDeploy.disableLog();
        if (saveOutput) LibDeploy.initOutputJSON(configId);
        deploy(configId, getAddr(deployer), disableLog, afterDeploy);
        if (saveOutput) LibDeploy.saveOutputJSON();
    }

    function deploy(
        string memory configId,
        address deployer,
        bool disableLog,
        string memory afterDeploy
    ) internal broadcastWithAddr(deployer) {
        chainConfig = LibDeployConfig.getChainConfig(configId);
        JSON.Assets memory assetConfig = LibDeployConfig.getAssetConfig(configId);

        rsPrices = assetConfig.mockRedstoneStr;
        rsPayload = getRedstonePayload(rsPrices);

        // Create deployment factory first
        factory = LibDeploy.createFactory(deployer);

        // Create mocks if needed
        if (chainConfig.common.council == address(0)) {
            chainConfig.common.council = LibDeployMocks.deployMockSafe(deployer);
        }

        if (assetConfig.mocked) {
            vm.warp(vm.unixTime());
            (assetConfig, chainConfig.common.sequencerUptimeFeed) = LibDeployMocks.createMocks(assetConfig);
            (chainConfig.periphery.officallyKreskianNFT, chainConfig.periphery.questForKreskNFT) = LibDeployMocks
                .createNFTMocks();
        } else {
            LibDeploy.saveChainConfig(assetConfig, chainConfig);
        }
        weth = assetConfig.nativeWrapper;

        // Gating managerrrrrr
        gatingManager = LibDeploy.createGatingManager(chainConfig);
        chainConfig.common.gatingManager = address(gatingManager);

        // Create base contracts
        kresko = DeployBase.deployDiamond(chainConfig);

        vault = LibDeploy.createVault(chainConfig, assetConfig.kiss);
        kiss = LibDeploy.createKISS(address(kresko), address(vault), chainConfig, assetConfig.kiss);

        LibDeploy.DeployedKrAsset[] memory deployedKrAssets;
        (assetConfig, deployedKrAssets) = LibDeploy.createKrAssets(address(kresko), chainConfig, assetConfig);

        /* ---------------------------- Externals --------------------------- */
        for (uint256 i; i < assetConfig.extAssets.length; i++) {
            JSON.ExtAssetConfig memory ext = assetConfig.extAssets[i];
            (JSON.TickerConfig memory ticker, address[2] memory feeds) = LibDeployConfig.getOracle(
                ext.config.ticker,
                ext.config.oracles,
                assetConfig.tickers
            );

            kresko.addAsset(ext.addr, ext.config.toAsset(), !tickersAdded[ticker.ticker] ? feeds : [address(0), address(0)]);
            tickersAdded[ticker.ticker] = true;
        }

        /* ------------------------------ KrAssets ------------------------------ */
        address[2] memory kissFeeds = [address(vault), address(0)];

        kresko.addAsset(address(kiss), assetConfig.kiss.config.toAsset(), kissFeeds).print(address(kresko), address(kiss));
        kresko.setFeeAssetSCDP(address(kiss));

        for (uint256 i; i < deployedKrAssets.length; i++) {
            LibDeploy.DeployedKrAsset memory krAsset = deployedKrAssets[i];
            (JSON.TickerConfig memory ticker, address[2] memory feeds) = LibDeployConfig.getOracle(
                krAsset.json.config.ticker,
                krAsset.json.config.oracles,
                assetConfig.tickers
            );

            kresko
                .addAsset(
                    krAsset.addr,
                    krAsset.json.config.toAsset(),
                    !tickersAdded[ticker.ticker] ? feeds : [address(0), address(0)]
                )
                .print(address(kresko), krAsset.addr);
            tickersAdded[ticker.ticker] = true;
        }

        /* -------------------------- Vault Assets -------------------------- */
        VaultAsset[] memory vaultAssets = LibDeployConfig.getVaultAssetConfig(configId);
        for (uint256 i; i < vaultAssets.length; i++) {
            vault.addAsset(vaultAssets[i]).print(address(vault));
        }

        Deployed.getAllTradeRoutes(tradeRoutes, address(kiss), assetConfig, routesAdded);
        kresko.setSwapRoutesSCDP(tradeRoutes);
        delete tradeRoutes;

        Deployed.getCustomTradeRoutes(tradeRoutes, assetConfig);
        for (uint256 i; i < tradeRoutes.length; i++) {
            kresko.setSingleSwapRouteSCDP(tradeRoutes[i]);
        }
        delete tradeRoutes;

        /* ---------------------------- Periphery --------------------------- */
        multicall = LibDeploy.createMulticall(address(kresko), address(kiss), chainConfig);
        dataV1 = LibDeploy.createDataV1(address(kresko), address(vault), address(kiss), chainConfig);

        Ownable(address(factory)).transferOwnership(chainConfig.common.admin);

        /* ------------------------------ Users ----------------------------- */
        JSON.UserConfig memory userCfg = LibDeployConfig.getUserConfig(configId);

        if (userCfg.useMockTokens) {
            for (uint256 i; i < userCfg.users.length; i++) {
                address user = getAddr(userCfg.users[i]);
                if (assetConfig.mocked) {
                    broadcastWith(user);
                    LibDeployUsers.makeBalances(user, userCfg, assetConfig);
                    LibDeployUsers.makeMinter(kresko, user, userCfg, assetConfig, rsPayload);
                    LibDeployUsers.mintKissMocked(
                        user,
                        userCfg.kissAmount,
                        address(vaultAssets[0].token),
                        address(vault),
                        address(kiss)
                    );
                }

                Deployed.printUser(user, address(kiss), assetConfig);
            }
            if (userCfg.kissDepositAmount != 0) {
                broadcastWith(deployer);
                LibDeployUsers.mintKissMocked(
                    deployer,
                    userCfg.kissDepositAmount,
                    address(vaultAssets[1].token),
                    address(vault),
                    address(kiss)
                );
                kiss.approve(address(kresko), type(uint256).max);
                kresko.depositSCDP(deployer, address(kiss), userCfg.kissDepositAmount);
            }
        }
        if (userCfg.useMockNFTs) {
            LibDeployUsers.mintMockNFTs([getAddr(0), getAddr(1), getAddr(2), getAddr(3)], chainConfig);
        }

        just(userCfg.setupCommand);

        gatingManager.setPhase(chainConfig.gatingPhase);
        if (!disableLog) Log.clg(chainConfig.gatingPhase, "Gating phase set to: ");

        Deployed.printUser(getAddr(0), address(kiss), assetConfig);
        if (!disableLog) {
            Log.br();
            Log.hr();
            Log.clg("Deployment finished!");
            Log.hr();
        }

        /* ------------------------------ Finish ----------------------------- */
        just(afterDeploy);
    }

    function localtest(uint32 deployer) public {
        run("localhost", deployer, false, true, "");
    }

    function just(string memory _justCmd) internal returns (bool) {
        if (bytes(_justCmd).length == 0) return false;
        string[] memory args = new string[](2);
        args[0] = "just";
        args[1] = _justCmd;
        vm.ffi(args);
        return true;
    }
}
