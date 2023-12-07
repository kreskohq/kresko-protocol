// solhint-disable code-complexity, state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {DeployBase} from "scripts/deploy/DeployBase.s.sol";
import {Scripted} from "kresko-lib/utils/Scripted.s.sol";
import {RsScript} from "kresko-lib/utils/ffi/RsScript.s.sol";
import {LibDeployConfig} from "scripts/deploy/libs/LibDeployConfig.s.sol";
import {LibDeployMocks} from "scripts/deploy/libs/LibDeployMocks.s.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {Asset} from "common/Types.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {Ownable} from "@oz/access/Ownable.sol";
import "scripts/deploy/libs/JSON.s.sol" as JSON;
import {MockERC20} from "mocks/MockERC20.sol";
import {IERC1155} from "common/interfaces/IERC1155.sol";

contract Deploy is Scripted, DeployBase, RsScript("./utils/rsPayload.js") {
    using Deployed for Asset;
    using Deployed for VaultAsset;
    using Help for *;

    mapping(string => bool) tickersAdded;
    mapping(bytes32 => bool) routesAdded;
    SwapRouteSetter[] tradeRoutes;

    function run(
        string memory config,
        string memory mnemonicEnv,
        uint32 deployer,
        bool saveOutput,
        bool disableLog
    ) public mnemonic(mnemonicEnv) {
        if (disableLog) LibDeploy.disableLog();
        if (saveOutput) LibDeploy.initJSON(config);
        deploy(config, getAddr(deployer), disableLog);
        if (saveOutput) LibDeploy.writeJSON();
    }

    function deploy(string memory config, address deployer, bool disableLog) internal broadcasted(deployer) {
        chainConfig = LibDeployConfig.getChainJSON(config);
        JSON.Assets memory assetConfig = LibDeployConfig.getAssetsJSON(config);

        // Create deployment factory first
        factory = LibDeploy.createFactory(deployer);

        // Create mocks if needed
        if (chainConfig.common.council == address(0)) {
            chainConfig.common.council = LibDeployMocks.deployMockSafe(deployer);
        }

        if (assetConfig.mocked) {
            vm.warp(vm.unixTime());
            (assetConfig, chainConfig.common.sequencerUptimeFeed) = LibDeployMocks.createMocks(assetConfig);
            (chainConfig.periphery.okNFT, chainConfig.periphery.qfkNFT) = LibDeployMocks.createNFTMocks();
        } else {
            LibDeploy.saveChainInputJSON(assetConfig, chainConfig);
        }
        weth = assetConfig.nativeWrapper;

        // Gating managerrrrrr
        gatingManager = LibDeploy.createGatingManager(chainConfig);
        chainConfig.common.gatingManager = address(gatingManager);

        // Create base contracts
        kresko = DeployBase.deployDiamond(chainConfig);
        rsInit(address(kresko), assetConfig.rsPrices);

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
        VaultAsset[] memory vaultAssets = LibDeployConfig.getVaultAssets(config);
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
        JSON.Users memory users = LibDeployConfig.getUsersJSON(config);

        if (users.accounts.length > 0) {
            setupUsers(deployer, chainConfig, users, assetConfig);

            if (!disableLog) {
                for (uint256 i; i < users.accounts.length; i++) {
                    Deployed.printUser(users.get(i), kresko, address(kiss), assetConfig);
                }
                Log.hr();
                Log.clg("Users setup finished!");
                Log.hr();
            }
        }

        broadcastWith(deployer);

        gatingManager.setPhase(chainConfig.gatingPhase);
        if (!disableLog) Log.clg(chainConfig.gatingPhase, "Gating phase set to: ");

        if (!disableLog) {
            Deployed.printProtocol(assetConfig, kresko, address(kiss));
            Log.br();
            Log.hr();
            Log.clg("Deployment finished!");
            Log.hr();
        }

        /* ------------------------------ Finish ----------------------------- */
    }

    function localtest(string memory mnemonic, uint32 deployer) public {
        run("localhost", mnemonic, deployer, false, true);
    }

    function setupUsers(
        address deployer,
        JSON.ChainConfig memory chainCfg,
        JSON.Users memory users,
        JSON.Assets memory assets
    ) internal {
        setupBalances(users, assets);
        setupSCDP(users, assets);
        setupMinter(users, assets);
        setupNFTs(users.nfts.nftsFrom == address(0) ? deployer : users.nfts.nftsFrom, users, chainCfg);
    }

    function setupBalances(JSON.Users memory users, JSON.Assets memory assets) internal {
        for (uint256 i; i < users.balances.length; i++) {
            JSON.Balance memory bal = users.balances[i];
            if (bal.user == JSON.ALL_USERS) {
                for (uint256 j; j < users.accounts.length; j++) {
                    setupBalance(assets, users.get(j), bal);
                }
            } else {
                setupBalance(assets, users.get(bal.user), bal);
            }
        }
    }

    function setupNativeWrapper(JSON.Assets memory assets, address user, JSON.Balance memory bal) internal broadcasted(user) {
        if (bal.amount == 0) return;
        if (bal.assetsFrom == address(0)) {
            vm.deal(user, bal.amount);
            assets.nativeWrapper.deposit{value: bal.amount}();
        } else if (bal.assetsFrom == address(1)) {
            assets.nativeWrapper.deposit{value: bal.amount}();
        } else {
            _transfer(bal.assetsFrom, user, address(assets.nativeWrapper), bal.amount);
        }
    }

    function setupBalance(
        JSON.Assets memory assets,
        address user,
        JSON.Balance memory bal
    ) internal rebroadcasted(user) returns (address tokenAddr) {
        tokenAddr = Deployed.tokenAddrRuntime(bal.symbol, assets);
        if (bal.amount == 0) return tokenAddr;

        if (tokenAddr == address(assets.nativeWrapper)) {
            setupNativeWrapper(assets, user, bal);
            return tokenAddr;
        }

        if (bal.assetsFrom == address(1)) {
            return tokenAddr;
        }

        if (bal.assetsFrom == address(0)) {
            _mintTokens(user, tokenAddr, bal.amount);
        } else {
            _transfer(bal.assetsFrom, user, tokenAddr, bal.amount);
        }
    }

    function setupSCDP(JSON.Users memory users, JSON.Assets memory assets) internal {
        for (uint256 i; i < users.scdp.length; i++) {
            JSON.SCDPPosition memory pos = users.scdp[i];
            if (pos.user == JSON.ALL_USERS) {
                for (uint256 j; j < users.accounts.length; j++) {
                    setupSCDPUser(assets, users.get(j), j, pos);
                }
            } else {
                setupSCDPUser(assets, users.get(pos.user), i, pos);
            }
        }
    }

    function setupMinter(JSON.Users memory users, JSON.Assets memory assets) internal {
        for (uint256 i; i < users.minter.length; i++) {
            JSON.MinterPosition memory pos = users.minter[i];
            bool isKISS = pos.mintSymbol.equals("KISS");
            if (pos.user == JSON.ALL_USERS) {
                for (uint256 j; j < users.accounts.length; j++) {
                    !isKISS ? setupMinterUser(assets, users.get(j), j, pos) : setupKISSBalance(assets, users.get(j), j, pos);
                }
            } else {
                !isKISS
                    ? setupMinterUser(assets, users.get(pos.user), i, pos)
                    : setupKISSBalance(assets, users.get(pos.user), i, pos);
            }
        }
    }

    function setupMinterUser(
        JSON.Assets memory assets,
        address user,
        uint256 index,
        JSON.MinterPosition memory pos
    ) internal broadcasted(user) {
        if (pos.depositAmount > 0) {
            address collAddr = setupBalance(
                assets,
                user,
                JSON.Balance(index, pos.depositSymbol, pos.depositAmount, pos.assetsFrom)
            );

            _maybeApprove(collAddr, address(kresko), 1);
            kresko.depositCollateral(user, collAddr, pos.depositAmount);
        }

        if (pos.mintAmount == 0) return;
        address krAssetAddr = Deployed.tokenAddrRuntime(pos.mintSymbol, assets);
        rsCall(kresko.mintKreskoAsset.selector, user, krAssetAddr, pos.mintAmount, user);
    }

    function setupKISSBalance(
        JSON.Assets memory assets,
        address user,
        uint256 index,
        JSON.MinterPosition memory pos
    ) internal broadcasted(user) {
        if (pos.depositAmount > 0) {
            address assetAddr = setupBalance(
                assets,
                user,
                JSON.Balance(index, pos.depositSymbol, pos.depositAmount, pos.assetsFrom)
            );
            _maybeApprove(assetAddr, address(kiss), 1);
            kiss.vaultDeposit(assetAddr, pos.depositAmount, user);
        } else {
            (uint256 assetsIn, ) = vault.previewMint(Deployed.tokenAddrRuntime(pos.depositSymbol, assets), pos.mintAmount);
            address assetAddr = setupBalance(assets, user, JSON.Balance(index, pos.depositSymbol, assetsIn, pos.assetsFrom));

            _maybeApprove(assetAddr, address(kiss), 1);
            kiss.vaultMint(assetAddr, pos.mintAmount, user);
        }
    }

    function setupSCDPUser(
        JSON.Assets memory assets,
        address user,
        uint256 index,
        JSON.SCDPPosition memory pos
    ) internal broadcasted(user) {
        if (pos.kissDeposits > 0) {
            address assetAddr = Deployed.tokenAddrRuntime(pos.vaultAssetSymbol, assets);
            (uint256 assetsIn, ) = vault.previewMint(assetAddr, pos.kissDeposits);

            setupBalance(assets, user, JSON.Balance(index, pos.vaultAssetSymbol, assetsIn, pos.assetsFrom));

            _maybeApprove(assetAddr, address(kiss), 1);
            kiss.vaultMint(assetAddr, pos.kissDeposits, user);

            _maybeApprove(address(kiss), address(kresko), 1);
            kresko.depositSCDP(user, address(kiss), pos.kissDeposits);
        }
    }

    function setupNFTs(address _owner, JSON.Users memory users, JSON.ChainConfig memory chain) internal broadcasted(_owner) {
        if (users.nfts.userCount == 0) return;
        IERC1155 okNFT = IERC1155(chain.periphery.okNFT);
        IERC1155 qfkNFT = IERC1155(chain.periphery.qfkNFT);
        for (uint256 i; i < users.nfts.userCount; i++) {
            address user = users.get(i);
            if (users.nfts.useMocks) {
                if (i < 5) {
                    okNFT.mint(user, 0, 1, "");
                }
                if (i < 3) {
                    qfkNFT.mint(user, 0, 1, "");
                }
                if (i < 2) {
                    qfkNFT.mint(user, 1, 1, "");
                    qfkNFT.mint(user, 2, 1, "");
                }
                if (i == 0) {
                    qfkNFT.mint(user, 2, 1, "");
                    qfkNFT.mint(user, 3, 1, "");
                    qfkNFT.mint(user, 4, 1, "");
                    qfkNFT.mint(user, 5, 1, "");
                    qfkNFT.mint(user, 6, 1, "");
                    qfkNFT.mint(user, 7, 1, "");
                }
            } else {
                if (i < 3) {
                    okNFT.safeTransferFrom(_owner, user, 0, 1, "");
                }
                if (i < 2) {
                    qfkNFT.safeTransferFrom(_owner, user, 1, 1, "");
                }
                if (i == 0) {
                    qfkNFT.safeTransferFrom(_owner, user, 2, 1, "");
                    qfkNFT.safeTransferFrom(_owner, user, 3, 1, "");
                    qfkNFT.safeTransferFrom(_owner, user, 4, 1, "");
                    qfkNFT.safeTransferFrom(_owner, user, 5, 1, "");
                }
            }
        }
    }

    function _maybeApprove(address token, address spender, uint256 amount) internal {
        if (MockERC20(token).allowance(peekSender(), spender) < amount) {
            MockERC20(token).approve(spender, type(uint256).max);
        }
    }

    function _mintTokens(address user, address token, uint256 amount) internal {
        MockERC20(token).mint(user, amount);
    }

    function _transfer(address from, address to, address token, uint256 amount) internal rebroadcasted(from) {
        MockERC20(token).transfer(to, amount);
    }

    // function mintKissMocked(address _account, uint256 _amount, address _vaultAsset, address _vault, address _kiss) internal {
    //     MockERC20 asset = MockERC20(_vaultAsset);
    //     (uint256 assetsIn, ) = IVault(_vault).previewMint(_vaultAsset, _amount);
    //     asset.mint(_account, assetsIn);
    //     asset.approve(_kiss, type(uint256).max);
    //     IKISS(_kiss).vaultMint(_vaultAsset, _amount, _account);
    // }
}
